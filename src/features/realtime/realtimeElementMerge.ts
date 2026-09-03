import { reconcileElements } from "@excalidraw/excalidraw";
import type { AppState } from "@excalidraw/excalidraw/types";
import type { RealtimeCanvasElement } from "./realtime.types";

export type RealtimeElementMergeResult = {
  elements: RealtimeCanvasElement[];
  changed: boolean;
  appliedCount: number;
  ignoredCount: number;
};

export function mergeRealtimeElements(
  currentElements: readonly unknown[],
  incomingElements: readonly unknown[],
  appState?: Partial<AppState>
): RealtimeElementMergeResult {
  const validIncomingElements = selectLatestIncomingElements(incomingElements);
  if (validIncomingElements.length === 0) {
    return {
      elements: [...currentElements] as RealtimeCanvasElement[],
      changed: false,
      appliedCount: 0,
      ignoredCount: incomingElements.length,
    };
  }

  if (appState) {
    try {
      const reconciledElements = reconcileElements(
        currentElements as readonly RealtimeCanvasElement[],
        validIncomingElements as unknown as Parameters<typeof reconcileElements>[1],
        appState as AppState
      ) as RealtimeCanvasElement[];

      return {
        elements: reconciledElements,
        changed: !areElementCollectionsEqual(currentElements, reconciledElements),
        appliedCount: countAppliedElements(currentElements, reconciledElements),
        ignoredCount: incomingElements.length - validIncomingElements.length,
      };
    } catch (error) {
      console.warn("FlowBoard realtime reconciliation fallback used", error);
    }
  }

  return fallbackMergeRealtimeElements(currentElements, validIncomingElements, incomingElements.length);
}

export function toRealtimeElement(value: unknown, expectedId?: string | null): RealtimeCanvasElement | null {
  if (!isRecord(value) || typeof value.id !== "string" || value.id.trim().length === 0) {
    return null;
  }

  if (expectedId && value.id !== expectedId) {
    return null;
  }

  return value as unknown as RealtimeCanvasElement;
}

export function createElementsFingerprint(elements: readonly unknown[]): string {
  return stableStringify(elements);
}

function fallbackMergeRealtimeElements(
  currentElements: readonly unknown[],
  incomingElements: readonly RealtimeCanvasElement[],
  originalIncomingCount: number
): RealtimeElementMergeResult {
  const incomingById = new Map(incomingElements.map((element) => [element.id, element]));
  const mergedElements: RealtimeCanvasElement[] = [];
  const seenIds = new Set<string>();
  let appliedCount = 0;

  for (const currentElement of currentElements) {
    const localElement = toRealtimeElement(currentElement);
    if (!localElement) {
      mergedElements.push(currentElement as RealtimeCanvasElement);
      continue;
    }

    const incomingElement = incomingById.get(localElement.id);
    if (!incomingElement) {
      mergedElements.push(localElement);
      seenIds.add(localElement.id);
      continue;
    }

    seenIds.add(localElement.id);
    if (shouldIncomingElementWin(localElement, incomingElement)) {
      mergedElements.push(incomingElement);
      appliedCount += 1;
    } else {
      mergedElements.push(localElement);
    }
  }

  for (const incomingElement of incomingElements) {
    if (seenIds.has(incomingElement.id)) {
      continue;
    }

    insertNewRemoteElement(mergedElements, incomingElement);
    seenIds.add(incomingElement.id);
    appliedCount += 1;
  }

  return {
    elements: mergedElements,
    changed: appliedCount > 0,
    appliedCount,
    ignoredCount: originalIncomingCount - appliedCount,
  };
}

function selectLatestIncomingElements(incomingElements: readonly unknown[]): RealtimeCanvasElement[] {
  const latestById = new Map<string, RealtimeCanvasElement>();

  for (const incomingElement of incomingElements) {
    const element = toRealtimeElement(incomingElement);
    if (!element) {
      continue;
    }

    const current = latestById.get(element.id);
    if (!current || shouldIncomingElementWin(current, element)) {
      latestById.set(element.id, element);
    }
  }

  return Array.from(latestById.values());
}

function shouldIncomingElementWin(localElement: RealtimeCanvasElement, incomingElement: RealtimeCanvasElement): boolean {
  if (areElementsSemanticallyEqual(localElement, incomingElement)) {
    return false;
  }

  const localVersion = getNumericProperty(localElement, "version");
  const incomingVersion = getNumericProperty(incomingElement, "version");

  if (incomingVersion > localVersion) {
    return true;
  }

  if (incomingVersion < localVersion) {
    return false;
  }

  const localVersionNonce = getNumericProperty(localElement, "versionNonce");
  const incomingVersionNonce = getNumericProperty(incomingElement, "versionNonce");

  if (incomingVersionNonce !== localVersionNonce) {
    return incomingVersionNonce < localVersionNonce;
  }

  return stableStringify(incomingElement) < stableStringify(localElement);
}

function insertNewRemoteElement(
  elements: RealtimeCanvasElement[],
  incomingElement: RealtimeCanvasElement
): void {
  const incomingIndex = getElementIndex(incomingElement);
  if (!incomingIndex) {
    elements.push(incomingElement);
    return;
  }

  const insertionIndex = elements.findIndex((element) => {
    const elementIndex = getElementIndex(element);
    return Boolean(elementIndex && elementIndex.localeCompare(incomingIndex) > 0);
  });

  if (insertionIndex === -1) {
    elements.push(incomingElement);
    return;
  }

  elements.splice(insertionIndex, 0, incomingElement);
}

function countAppliedElements(
  currentElements: readonly unknown[],
  mergedElements: readonly RealtimeCanvasElement[]
): number {
  const currentById = new Map<string, unknown>();
  for (const element of currentElements) {
    const realtimeElement = toRealtimeElement(element);
    if (realtimeElement) {
      currentById.set(realtimeElement.id, realtimeElement);
    }
  }

  return mergedElements.reduce((count, element) => {
    const currentElement = currentById.get(element.id);
    return !currentElement || !areElementsSemanticallyEqual(currentElement, element) ? count + 1 : count;
  }, 0);
}

function areElementCollectionsEqual(
  leftElements: readonly unknown[],
  rightElements: readonly unknown[]
): boolean {
  return createElementsFingerprint(leftElements) === createElementsFingerprint(rightElements);
}

function areElementsSemanticallyEqual(left: unknown, right: unknown): boolean {
  return stableStringify(left) === stableStringify(right);
}

function getNumericProperty(element: unknown, property: "version" | "versionNonce"): number {
  if (!isRecord(element) || typeof element[property] !== "number") {
    return 0;
  }

  return element[property];
}

function getElementIndex(element: unknown): string | null {
  if (!isRecord(element) || typeof element.index !== "string") {
    return null;
  }

  return element.index;
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
