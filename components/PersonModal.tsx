"use client";

import { useMemo, useState } from "react";
import type { ParentType, Person, PersonDraft } from "@/types/family";

type PersonModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  parentType?: ParentType;
  person?: Person;
  onClose: () => void;
  onSubmit: (draft: PersonDraft) => void;
};

type FormState = {
  name: string;
  gender: "male" | "female" | "other";
  birthDate: string;
  deathDate: string;
};

const emptyState: FormState = {
  name: "",
  gender: "other",
  birthDate: "",
  deathDate: "",
};

const defaultCreateGender = (parentType?: ParentType): FormState["gender"] => {
  if (parentType === "father") {
    return "male";
  }
  if (parentType === "mother") {
    return "female";
  }
  return "other";
};

export const PersonModal = ({ isOpen, mode, parentType, person, onClose, onSubmit }: PersonModalProps) => {
  const initialState = useMemo<FormState>(() => {
    if (mode === "edit" && person) {
      return {
        name: person.name,
        gender: person.gender,
        birthDate: person.birthDate ?? "",
        deathDate: person.deathDate ?? "",
      };
    }

    return {
      ...emptyState,
      gender: defaultCreateGender(parentType),
    };
  }, [mode, parentType, person]);

  const [form, setForm] = useState<FormState>(initialState);

  if (!isOpen) {
    return null;
  }

  const title =
    mode === "edit"
      ? "Edit Person"
      : parentType === "father"
        ? "Add Father"
        : parentType === "mother"
          ? "Add Mother"
          : "Add Person";

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel">
        <h2 className="modal-title">{title}</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!form.name.trim()) {
              return;
            }
            onSubmit({
              name: form.name.trim(),
              gender: form.gender,
              birthDate: form.birthDate || undefined,
              deathDate: form.deathDate || undefined,
            });
          }}
        >
          <label className="form-field">
            Name
            <input
              value={form.name}
              onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
              placeholder="Full name"
              required
            />
          </label>

          <label className="form-field">
            Gender
            <select
              value={form.gender}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  gender: event.target.value as FormState["gender"],
                }))
              }
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>

          <div className="form-grid">
            <label className="form-field">
              Birth Date
              <input
                type="date"
                value={form.birthDate}
                onChange={(event) => setForm((previous) => ({ ...previous, birthDate: event.target.value }))}
              />
            </label>
            <label className="form-field">
              Death Date
              <input
                type="date"
                value={form.deathDate}
                onChange={(event) => setForm((previous) => ({ ...previous, deathDate: event.target.value }))}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="control-button ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="control-button">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
