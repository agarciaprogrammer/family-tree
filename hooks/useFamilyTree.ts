"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FamilyTreeState, Gender, ParentType, Person, PersonDraft } from "@/types/family";

const STORAGE_KEY = "family_tree_v1";
const DEFAULT_ROOT_ID = "root-person";

const isGender = (value: unknown): value is Gender =>
  value === "male" || value === "female" || value === "other";

const asNonEmptyString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : undefined;
};

const toOptionalDate = (value: unknown): string | undefined => asNonEmptyString(value);

const createDefaultState = (): FamilyTreeState => ({
  rootId: DEFAULT_ROOT_ID,
  people: {
    [DEFAULT_ROOT_ID]: {
      id: DEFAULT_ROOT_ID,
      name: "Root Person",
      gender: "other",
    },
  },
});

const normalizePerson = (input: unknown): Person | undefined => {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const raw = input as Record<string, unknown>;
  const id = asNonEmptyString(raw.id);
  if (!id) {
    return undefined;
  }

  const name = asNonEmptyString(raw.name) ?? "Unnamed Person";
  const gender = isGender(raw.gender) ? raw.gender : "other";
  const fatherId = asNonEmptyString(raw.fatherId);
  const motherId = asNonEmptyString(raw.motherId);

  return {
    id,
    name,
    gender,
    birthDate: toOptionalDate(raw.birthDate),
    deathDate: toOptionalDate(raw.deathDate),
    fatherId: fatherId && fatherId !== id ? fatherId : undefined,
    motherId: motherId && motherId !== id ? motherId : undefined,
  };
};

const collectReachableAncestors = (rootId: string, people: Record<string, Person>): Set<string> => {
  const visited = new Set<string>();
  const stack: string[] = [rootId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || visited.has(currentId) || !people[currentId]) {
      continue;
    }
    visited.add(currentId);
    const person = people[currentId];
    if (person.fatherId) {
      stack.push(person.fatherId);
    }
    if (person.motherId) {
      stack.push(person.motherId);
    }
  }

  return visited;
};

const createsCycle = (
  potentialParentId: string,
  childId: string,
  people: Record<string, Person>,
  visited = new Set<string>(),
): boolean => {
  if (potentialParentId === childId) {
    return true;
  }
  if (visited.has(potentialParentId)) {
    return false;
  }

  visited.add(potentialParentId);
  const person = people[potentialParentId];
  if (!person) {
    return false;
  }

  if (person.fatherId && createsCycle(person.fatherId, childId, people, visited)) {
    return true;
  }
  if (person.motherId && createsCycle(person.motherId, childId, people, visited)) {
    return true;
  }

  return false;
};

const pruneToReachable = (state: FamilyTreeState): FamilyTreeState => {
  const root = state.people[state.rootId];
  if (!root) {
    return createDefaultState();
  }

  const reachable = collectReachableAncestors(state.rootId, state.people);
  const prunedPeople: Record<string, Person> = {};

  for (const id of reachable) {
    const person = state.people[id];
    if (person) {
      prunedPeople[id] = person;
    }
  }

  return {
    rootId: state.rootId,
    people: prunedPeople,
  };
};

const sanitizeState = (raw: unknown): FamilyTreeState => {
  if (!raw || typeof raw !== "object") {
    return createDefaultState();
  }

  const source = raw as Record<string, unknown>;
  const peopleSource = source.people;
  const people: Record<string, Person> = {};

  if (Array.isArray(peopleSource)) {
    for (const item of peopleSource) {
      const person = normalizePerson(item);
      if (person) {
        people[person.id] = person;
      }
    }
  } else if (peopleSource && typeof peopleSource === "object") {
    for (const value of Object.values(peopleSource as Record<string, unknown>)) {
      const person = normalizePerson(value);
      if (person) {
        people[person.id] = person;
      }
    }
  }

  const ids = Object.keys(people);
  if (ids.length === 0) {
    return createDefaultState();
  }

  const rootIdCandidate = asNonEmptyString(source.rootId);
  const rootId = rootIdCandidate && people[rootIdCandidate] ? rootIdCandidate : ids[0];

  for (const person of Object.values(people)) {
    if (person.fatherId && !people[person.fatherId]) {
      person.fatherId = undefined;
    }
    if (person.motherId && !people[person.motherId]) {
      person.motherId = undefined;
    }
    if (person.fatherId && person.motherId && person.fatherId === person.motherId) {
      person.motherId = undefined;
    }
  }

  for (const person of Object.values(people)) {
    if (person.fatherId && createsCycle(person.fatherId, person.id, people)) {
      person.fatherId = undefined;
    }
    if (person.motherId && createsCycle(person.motherId, person.id, people)) {
      person.motherId = undefined;
    }
  }

  return pruneToReachable({ rootId, people });
};

const generatePersonId = (people: Record<string, Person>): string => {
  let id = "";
  while (!id || people[id]) {
    id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `person_${Math.random().toString(36).slice(2, 10)}`;
  }
  return id;
};

const sanitizeDraft = (draft: PersonDraft): PersonDraft => ({
  name: draft.name.trim(),
  gender: draft.gender,
  birthDate: asNonEmptyString(draft.birthDate),
  deathDate: asNonEmptyString(draft.deathDate),
});

export const useFamilyTree = () => {
  const [state, setState] = useState<FamilyTreeState>(() => createDefaultState());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        setState(sanitizeState(parsed));
      }
    } catch {
      setState(createDefaultState());
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [isReady, state]);

  const addParent = useCallback(
    (childId: string, parentType: ParentType, draft: PersonDraft) => {
      setState((previous) => {
        const child = previous.people[childId];
        if (!child) {
          return previous;
        }
        if (parentType === "father" && child.fatherId) {
          return previous;
        }
        if (parentType === "mother" && child.motherId) {
          return previous;
        }

        const cleanedDraft = sanitizeDraft(draft);
        const parentId = generatePersonId(previous.people);
        const newParent: Person = {
          id: parentId,
          name: cleanedDraft.name || "Unnamed Person",
          gender: cleanedDraft.gender,
          birthDate: cleanedDraft.birthDate,
          deathDate: cleanedDraft.deathDate,
        };

        const nextChild: Person = {
          ...child,
          fatherId: parentType === "father" ? parentId : child.fatherId,
          motherId: parentType === "mother" ? parentId : child.motherId,
        };

        return pruneToReachable({
          rootId: previous.rootId,
          people: {
            ...previous.people,
            [parentId]: newParent,
            [child.id]: nextChild,
          },
        });
      });
    },
    [],
  );

  const updatePerson = useCallback((personId: string, draft: PersonDraft) => {
    setState((previous) => {
      const person = previous.people[personId];
      if (!person) {
        return previous;
      }

      const cleanedDraft = sanitizeDraft(draft);
      return {
        ...previous,
        people: {
          ...previous.people,
          [personId]: {
            ...person,
            name: cleanedDraft.name || "Unnamed Person",
            gender: cleanedDraft.gender,
            birthDate: cleanedDraft.birthDate,
            deathDate: cleanedDraft.deathDate,
          },
        },
      };
    });
  }, []);

  const deletePerson = useCallback((personId: string) => {
    setState((previous) => {
      if (!previous.people[personId]) {
        return previous;
      }

      if (personId === previous.rootId) {
        return createDefaultState();
      }

      const nextPeople: Record<string, Person> = {};
      for (const [id, person] of Object.entries(previous.people)) {
        if (id === personId) {
          continue;
        }
        nextPeople[id] = {
          ...person,
          fatherId: person.fatherId === personId ? undefined : person.fatherId,
          motherId: person.motherId === personId ? undefined : person.motherId,
        };
      }

      return pruneToReachable({
        rootId: previous.rootId,
        people: nextPeople,
      });
    });
  }, []);

  const rootPerson = useMemo(() => state.people[state.rootId], [state]);

  return {
    isReady,
    rootId: state.rootId,
    rootPerson,
    people: state.people,
    addParent,
    updatePerson,
    deletePerson,
  };
};
