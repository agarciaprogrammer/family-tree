"use client";

import { useState } from "react";
import { PersonModal } from "@/components/PersonModal";
import { TreeGraph } from "@/components/TreeGraph";
import { useFamilyTree } from "@/hooks/useFamilyTree";
import type { ParentType, PersonDraft } from "@/types/family";

type ModalState =
  | { kind: "closed" }
  | { kind: "create"; childId: string; parentType: ParentType }
  | { kind: "edit"; personId: string };

const closedModal: ModalState = { kind: "closed" };

export default function Home() {
  const { people, rootId, isReady, addParent, updatePerson, deletePerson } = useFamilyTree();
  const [modalState, setModalState] = useState<ModalState>(closedModal);

  const handleModalSubmit = (draft: PersonDraft) => {
    if (modalState.kind === "create") {
      addParent(modalState.childId, modalState.parentType, draft);
    } else if (modalState.kind === "edit") {
      updatePerson(modalState.personId, draft);
    }
    setModalState(closedModal);
  };

  const personBeingEdited =
    modalState.kind === "edit" && people[modalState.personId] ? people[modalState.personId] : undefined;

  return (
    <div className="app-shell">
      <header className="app-toolbar">
        <div className="title-group">
          <h1>Family Tree</h1>
          <p>Interactive vertical ancestry graph with local persistence.</p>
        </div>
      </header>

      <TreeGraph
        rootId={rootId}
        people={people}
        onAddParent={(childId, parentType) => setModalState({ kind: "create", childId, parentType })}
        onEditPerson={(personId) => setModalState({ kind: "edit", personId })}
        onDeletePerson={(personId) => {
          const personName = people[personId]?.name ?? "this person";
          const isRoot = personId === rootId;
          const message = isRoot
            ? "Delete the root person and reset the tree to a fresh root?"
            : `Delete ${personName} and remove this branch from the tree?`;

          if (window.confirm(message)) {
            deletePerson(personId);
          }
        }}
      />

      <PersonModal
        key={
          modalState.kind === "create"
            ? `create-${modalState.childId}-${modalState.parentType}`
            : modalState.kind === "edit"
              ? `edit-${modalState.personId}`
              : "closed"
        }
        isOpen={modalState.kind !== "closed"}
        mode={modalState.kind === "edit" ? "edit" : "create"}
        parentType={modalState.kind === "create" ? modalState.parentType : undefined}
        person={personBeingEdited}
        onClose={() => setModalState(closedModal)}
        onSubmit={handleModalSubmit}
      />

      {!isReady ? <p className="loading-note">Loading saved tree...</p> : null}
    </div>
  );
}
