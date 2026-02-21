export type Gender = "male" | "female" | "other";

export type Person = {
  id: string;
  name: string;
  gender: Gender;
  birthDate?: string;
  deathDate?: string;
  fatherId?: string;
  motherId?: string;
};

export type ParentType = "father" | "mother";

export type PersonDraft = {
  name: string;
  gender: Gender;
  birthDate?: string;
  deathDate?: string;
};

export type FamilyTreeState = {
  rootId: string;
  people: Record<string, Person>;
};
