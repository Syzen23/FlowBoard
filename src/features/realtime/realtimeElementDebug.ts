import { toRealtimeElement } from "./realtimeElementMerge";

export function logRealtimeElementDebug(label: string, element: unknown): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.info(`[${label}]`, getRealtimeElementDebugFields(element));
}

export function logRealtimeElementsDebug(label: string, elements: readonly unknown[]): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.info(`[${label}]`, elements.map(getRealtimeElementDebugFields));
}

export function getRealtimeElementDebugFields(element: unknown): RealtimeElementDebugFields {
  const realtimeElement = toRealtimeElement(element);
  if (!realtimeElement) {
    return {
      id: null,
      type: null,
      version: null,
      versionNonce: null,
      x: null,
      y: null,
      width: null,
      height: null,
      isDeleted: null,
    };
  }

  return {
    id: realtimeElement.id,
    type: realtimeElement.type,
    version: getNumber(realtimeElement.version),
    versionNonce: getNumber(realtimeElement.versionNonce),
    x: getNumber(realtimeElement.x),
    y: getNumber(realtimeElement.y),
    width: getNumber(realtimeElement.width),
    height: getNumber(realtimeElement.height),
    isDeleted: typeof realtimeElement.isDeleted === "boolean" ? realtimeElement.isDeleted : null,
  };
}

type RealtimeElementDebugFields = {
  id: string | null;
  type: string | null;
  version: number | null;
  versionNonce: number | null;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
  isDeleted: boolean | null;
};

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
