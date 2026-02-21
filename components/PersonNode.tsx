import type { Person } from "@/types/family";

type PersonNodeProps = {
  person: Person;
  x: number;
  y: number;
  isRoot: boolean;
  hasFather: boolean;
  hasMother: boolean;
  onAddFather: (id: string) => void;
  onAddMother: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

const formatLifespan = (person: Person): string => {
  const birth = person.birthDate ?? "?";
  const death = person.deathDate ?? "Living";
  return `${birth} - ${death}`;
};

export const PersonNode = ({
  person,
  x,
  y,
  isRoot,
  hasFather,
  hasMother,
  onAddFather,
  onAddMother,
  onEdit,
  onDelete,
}: PersonNodeProps) => {
  const initial = person.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <article className="person-node" style={{ left: x, top: y }}>
      <div className={`person-card gender-${person.gender}`}>
        <header className="person-header">
          <div className="avatar-placeholder" aria-hidden>
            {initial}
          </div>
          <div className="person-meta">
            <h3 className="person-name">{person.name}</h3>
            <p className="person-life">{formatLifespan(person)}</p>
          </div>
          {isRoot ? <span className="root-chip">Root</span> : null}
        </header>

        <div className="person-actions-row">
          <button type="button" className="small-button" onClick={() => onEdit(person.id)}>
            Edit
          </button>
          <button type="button" className="small-button danger-button" onClick={() => onDelete(person.id)}>
            Delete
          </button>
        </div>

        <div className="parent-actions">
          <button
            type="button"
            className="small-button"
            disabled={hasFather}
            onClick={() => onAddFather(person.id)}
            title={hasFather ? "Father already assigned" : "Add father"}
          >
            Add Father
          </button>
          <button
            type="button"
            className="small-button"
            disabled={hasMother}
            onClick={() => onAddMother(person.id)}
            title={hasMother ? "Mother already assigned" : "Add mother"}
          >
            Add Mother
          </button>
        </div>
      </div>
    </article>
  );
};
