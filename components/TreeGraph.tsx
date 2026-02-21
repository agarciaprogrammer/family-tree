"use client";

import { useMemo } from "react";
import { PersonNode } from "@/components/PersonNode";
import type { ParentType, Person } from "@/types/family";

type TreeGraphProps = {
  rootId: string;
  people: Record<string, Person>;
  onAddParent: (childId: string, parentType: ParentType) => void;
  onEditPerson: (personId: string) => void;
  onDeletePerson: (personId: string) => void;
};

type LayoutNode = {
  person: Person;
  depth: number;
  x: number;
  y: number;
};

type LayoutEdge = {
  childId: string;
  parentId: string;
};

type Layout = {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
  generationRows: Array<{ depth: number; y: number; label: string }>;
};

const NODE_WIDTH = 220;
const NODE_HEIGHT = 176;
const TOP_PADDING = 72;
const BOTTOM_PADDING = 72;
const SIDE_MARGIN = 88;
const ROW_GAP = 230;
const PARENT_GAP = 72;
const MIN_WIDTH = 900;
const MIN_HEIGHT = 560;

const generationLabel = (depth: number): string => {
  if (depth === 0) {
    return "Root";
  }
  if (depth === 1) {
    return "Parents";
  }
  if (depth === 2) {
    return "Grandparents";
  }
  return `${"Great-".repeat(depth - 2)}Grandparents`;
};

const buildLayout = (rootId: string, people: Record<string, Person>): Layout => {
  if (!people[rootId]) {
    return {
      nodes: [],
      edges: [],
      width: MIN_WIDTH,
      height: MIN_HEIGHT,
      generationRows: [],
    };
  }

  const getParentIds = (personId: string): string[] => {
    const person = people[personId];
    if (!person) {
      return [];
    }
    const ids: string[] = [];
    if (person.fatherId && people[person.fatherId]) {
      ids.push(person.fatherId);
    }
    if (person.motherId && people[person.motherId]) {
      ids.push(person.motherId);
    }
    return ids;
  };

  const depthMap = new Map<string, number>();
  const queue: string[] = [rootId];
  depthMap.set(rootId, 0);

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }
    const person = people[currentId];
    if (!person) {
      continue;
    }
    const currentDepth = depthMap.get(currentId) ?? 0;
    for (const parentId of getParentIds(currentId)) {
      if (!parentId || !people[parentId]) {
        continue;
      }
      const existing = depthMap.get(parentId);
      const candidateDepth = currentDepth + 1;
      if (existing === undefined || candidateDepth < existing) {
        depthMap.set(parentId, candidateDepth);
        queue.push(parentId);
      }
    }
  }

  const maxDepth = Math.max(...depthMap.values(), 0);
  const subtreeWidth = new Map<string, number>();
  const nodeCenter = new Map<string, number>();

  // Pass 1: recursively measure every reachable subtree.
  // A leaf takes NODE_WIDTH. A node with parents uses the sum of parent subtree
  // widths plus spacing, and never shrinks below NODE_WIDTH.
  const measureSubtree = (personId: string, path: Set<string>): number => {
    if (subtreeWidth.has(personId)) {
      return subtreeWidth.get(personId) ?? NODE_WIDTH;
    }
    if (path.has(personId)) {
      return NODE_WIDTH;
    }

    const nextPath = new Set(path);
    nextPath.add(personId);
    const parents = getParentIds(personId);

    let width = NODE_WIDTH;
    if (parents.length === 1) {
      width = Math.max(NODE_WIDTH, measureSubtree(parents[0], nextPath));
    } else if (parents.length === 2) {
      const firstWidth = measureSubtree(parents[0], nextPath);
      const secondWidth = measureSubtree(parents[1], nextPath);
      width = Math.max(NODE_WIDTH, firstWidth + PARENT_GAP + secondWidth);
    }

    subtreeWidth.set(personId, width);
    return width;
  };

  // Pass 2: assign horizontal centers by placing parent subtrees from left-to-right
  // within each node's measured subtree box, then centering the child between parents.
  const placeSubtree = (personId: string, left: number, path: Set<string>): number => {
    const existing = nodeCenter.get(personId);
    if (existing !== undefined) {
      return existing;
    }
    if (path.has(personId)) {
      return left + (subtreeWidth.get(personId) ?? NODE_WIDTH) / 2;
    }

    const nextPath = new Set(path);
    nextPath.add(personId);

    const width = subtreeWidth.get(personId) ?? NODE_WIDTH;
    const parents = getParentIds(personId);

    let center = left + width / 2;

    if (parents.length === 1) {
      const parentWidth = subtreeWidth.get(parents[0]) ?? NODE_WIDTH;
      const parentLeft = left + (width - parentWidth) / 2;
      center = placeSubtree(parents[0], parentLeft, nextPath);
    } else if (parents.length === 2) {
      const firstWidth = subtreeWidth.get(parents[0]) ?? NODE_WIDTH;
      const secondWidth = subtreeWidth.get(parents[1]) ?? NODE_WIDTH;
      const parentsWidth = firstWidth + PARENT_GAP + secondWidth;
      const parentsLeft = left + (width - parentsWidth) / 2;

      const firstCenter = placeSubtree(parents[0], parentsLeft, nextPath);
      const secondLeft = parentsLeft + firstWidth + PARENT_GAP;
      const secondCenter = placeSubtree(parents[1], secondLeft, nextPath);
      center = (firstCenter + secondCenter) / 2;
    }

    nodeCenter.set(personId, center);
    return center;
  };

  measureSubtree(rootId, new Set<string>());
  placeSubtree(rootId, 0, new Set<string>());

  const rawNodes: LayoutNode[] = [];
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;

  for (const [id, depth] of depthMap.entries()) {
    const person = people[id];
    if (!person) {
      continue;
    }
    const center = nodeCenter.get(id) ?? (subtreeWidth.get(id) ?? NODE_WIDTH) / 2;
    const left = center - NODE_WIDTH / 2;
    const right = center + NODE_WIDTH / 2;
    minX = Math.min(minX, left);
    maxX = Math.max(maxX, right);

    rawNodes.push({
      person,
      depth,
      x: left,
      y: TOP_PADDING + (maxDepth - depth) * ROW_GAP,
    });
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    return {
      nodes: [],
      edges: [],
      width: MIN_WIDTH,
      height: MIN_HEIGHT,
      generationRows: [],
    };
  }

  const contentWidth = Math.max(NODE_WIDTH, maxX - minX);
  const width = Math.max(MIN_WIDTH, contentWidth + SIDE_MARGIN * 2);
  const contentCenter = (minX + maxX) / 2;
  const offsetX = width / 2 - contentCenter;

  const positionedNodes = rawNodes.map((node) => ({
    ...node,
    x: node.x + offsetX,
  }));

  const edges: LayoutEdge[] = [];
  for (const childId of depthMap.keys()) {
    for (const parentId of getParentIds(childId)) {
      if (depthMap.has(parentId)) {
        edges.push({ childId, parentId });
      }
    }
  }

  const generationRows = Array.from({ length: maxDepth + 1 }, (_, depth) => ({
    depth,
    y: TOP_PADDING + (maxDepth - depth) * ROW_GAP,
    label: generationLabel(depth),
  }));

  const height = Math.max(MIN_HEIGHT, TOP_PADDING + BOTTOM_PADDING + maxDepth * ROW_GAP + NODE_HEIGHT);

  return {
    nodes: positionedNodes,
    edges,
    width,
    height,
    generationRows,
  };
};

export const TreeGraph = ({ rootId, people, onAddParent, onEditPerson, onDeletePerson }: TreeGraphProps) => {
  const layout = useMemo(() => buildLayout(rootId, people), [people, rootId]);
  const nodeMap = useMemo(
    () => Object.fromEntries(layout.nodes.map((node) => [node.person.id, node])),
    [layout.nodes],
  );

  return (
    <section className="tree-panel">
      <div className="tree-viewport">
        <div className="tree-canvas" style={{ width: layout.width, height: layout.height }}>
          <svg className="tree-svg" width={layout.width} height={layout.height} aria-hidden>
            {layout.edges.map(({ childId, parentId }) => {
              const child = nodeMap[childId];
              const parent = nodeMap[parentId];
              if (!child || !parent) {
                return null;
              }

              const childX = child.x + NODE_WIDTH / 2;
              const childY = child.y;
              const parentX = parent.x + NODE_WIDTH / 2;
              const parentY = parent.y + NODE_HEIGHT;
              const midY = (childY + parentY) / 2;
              const path = `M ${childX} ${childY} C ${childX} ${midY}, ${parentX} ${midY}, ${parentX} ${parentY}`;

              return <path key={`${childId}:${parentId}`} d={path} className="tree-connector" />;
            })}
          </svg>

          {layout.generationRows.map((row) => (
            <div key={row.depth} className="generation-label" style={{ top: row.y - 28 }}>
              {row.label}
            </div>
          ))}

          {layout.nodes.map(({ person, x, y }) => (
            <PersonNode
              key={person.id}
              person={person}
              x={x}
              y={y}
              isRoot={person.id === rootId}
              hasFather={Boolean(person.fatherId && people[person.fatherId])}
              hasMother={Boolean(person.motherId && people[person.motherId])}
              onAddFather={(id) => onAddParent(id, "father")}
              onAddMother={(id) => onAddParent(id, "mother")}
              onEdit={onEditPerson}
              onDelete={onDeletePerson}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
