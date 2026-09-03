import type { RealtimeCanvasElement } from "./realtime.types";

export type RealtimeElementDiffResult = {
  changed: RealtimeCanvasElement[];
  unchangedCount: number;
  missingIds: string[];
  invalidCount: number;
};

export function diffRealtimeElements(
  previousElements: readonly unknown[],
  nextElements: readonly unknown[]
): RealtimeElementDiffResult {
  const previousById = new Map<string, unknown>();

  for (const element of previousElements) {
    const elementId = getElementId(element);
    if (elementId) {
      previousById.set(elementId, element);
    }
  }

  const nextIds = new Set<string>();
  const changed: RealtimeCanvasElement[] = [];
  let unchangedCount = 0;
  let invalidCount = 0;

  for (const element of nextElements) {
    const elementId = getElementId(element);
    if (!elementId || !isRecord(element)) {
      invalidCount += 1;
      continue;
    }

    nextIds.add(elementId);

    const previousElement = previousById.get(elementId);
    if (!previousElement || !areElementsSemanticallyEqual(previousElement, element)) {
      changed.push(element as unknown as RealtimeCanvasElement);
      continue;
    }

    unchangedCount += 1;
  }

  const missingIds = Array.from(previousById.keys()).filter((elementId) => !nextIds.has(elementId));

  return {
    changed,
    unchangedCount,
    missingIds,
    invalidCount,
  };
}

export function areElementsSemanticallyEqual(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right);
}

function getElementId(element: unknown): string | null {
  if (!isRecord(element) || typeof element.id !== "string" || element.id.trim().length === 0) {
    return null;
  }

  return element.id;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value));
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = sortObjectKeys(value[key]);
      return result;
    }, {});
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
