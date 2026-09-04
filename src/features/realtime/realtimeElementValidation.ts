import { restoreElements } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { RealtimeCanvasElement } from "./realtime.types";
import { toRealtimeElement } from "./realtimeElementMerge";
import { logRealtimeElementDebug } from "./realtimeElementDebug";

type ValidationContext = "publish" | "receive";

type ElementDiagnostic = {
  id: string | null;
  type: string | null;
  issues: string[];
};

type PrepareRealtimeElementsResult = {
  elements: RealtimeCanvasElement[];
  rejectedCount: number;
};

const loggedInvalidElements = new Set<string>();

export function prepareRealtimeElementsForScene(
  elements: readonly unknown[],
  localElements: readonly unknown[]
): PrepareRealtimeElementsResult {
  const restoredElements = restoreElements(
    elements as Parameters<typeof restoreElements>[0],
    localElements as readonly ExcalidrawElement[],
    {
      refreshDimensions: false,
      repairBindings: false,
    }
  );
  const restoredElementsWithRemoteMetadata = preserveRemoteCollaborationMetadata(
    elements,
    restoredElements
  );

  return filterValidRealtimeElements(restoredElementsWithRemoteMetadata, "receive");
}

function preserveRemoteCollaborationMetadata(
  originalElements: readonly unknown[],
  restoredElements: readonly unknown[]
): unknown[] {
  const originalById = new Map<string, RealtimeCanvasElement>();
  for (const originalElement of originalElements) {
    const realtimeElement = toRealtimeElement(originalElement);
    if (realtimeElement) {
      originalById.set(realtimeElement.id, realtimeElement);
    }
  }

  return restoredElements.map((restoredElement) => {
    const restoredRealtimeElement = toRealtimeElement(restoredElement);
    if (!restoredRealtimeElement) {
      return restoredElement;
    }

    const originalElement = originalById.get(restoredRealtimeElement.id);
    if (!originalElement) {
      return restoredElement;
    }

    if (hasCollaborationMetadataChanged(originalElement, restoredRealtimeElement)) {
      logRealtimeElementDebug("RTDB RESTORE INPUT", originalElement);
      logRealtimeElementDebug("RTDB RESTORE OUTPUT", restoredRealtimeElement);
    }

    return {
      ...restoredRealtimeElement,
      version: originalElement.version,
      versionNonce: originalElement.versionNonce,
      index: originalElement.index,
      updated: originalElement.updated,
    };
  });
}

function hasCollaborationMetadataChanged(
  originalElement: RealtimeCanvasElement,
  restoredElement: RealtimeCanvasElement
): boolean {
  return (
    originalElement.version !== restoredElement.version ||
    originalElement.versionNonce !== restoredElement.versionNonce ||
    originalElement.index !== restoredElement.index ||
    originalElement.updated !== restoredElement.updated
  );
}

export function filterValidRealtimeElements(
  elements: readonly unknown[],
  context: ValidationContext
): PrepareRealtimeElementsResult {
  const validElements: RealtimeCanvasElement[] = [];
  let rejectedCount = 0;

  for (const element of elements) {
    const diagnostic = diagnoseRealtimeElement(element);
    if (diagnostic.issues.length > 0) {
      logInvalidElement(diagnostic, context);
      rejectedCount += 1;
      continue;
    }

    const realtimeElement = toRealtimeElement(element);
    if (realtimeElement) {
      validElements.push(realtimeElement);
    }
  }

  return {
    elements: validElements,
    rejectedCount,
  };
}

export function diagnoseRealtimeElement(element: unknown): ElementDiagnostic {
  if (!isRecord(element)) {
    return {
      id: null,
      type: null,
      issues: ["element must be an object"],
    };
  }

  const id = typeof element.id === "string" ? element.id : null;
  const type = typeof element.type === "string" ? element.type : null;
  const issues: string[] = [];

  if (!id || id.trim().length === 0) issues.push("id must be a non-empty string");
  if (!isSupportedElementType(type)) issues.push("type must be a supported Excalidraw element type");

  for (const property of BASE_NUMBER_PROPERTIES) {
    if (!isFiniteNumber(element[property])) {
      issues.push(`${property} must be a finite number`);
    }
  }

  for (const property of BASE_STRING_PROPERTIES) {
    if (typeof element[property] !== "string") {
      issues.push(`${property} must be a string`);
    }
  }

  if (!Array.isArray(element.groupIds)) issues.push("groupIds must be an array");
  if (element.boundElements !== null && !Array.isArray(element.boundElements)) {
    issues.push("boundElements must be null or an array");
  }
  if (element.roundness !== null && !isRecord(element.roundness)) {
    issues.push("roundness must be null or an object");
  }
  if (typeof element.isDeleted !== "boolean") issues.push("isDeleted must be a boolean");
  if (typeof element.locked !== "boolean") issues.push("locked must be a boolean");
  if (element.frameId !== null && typeof element.frameId !== "string") {
    issues.push("frameId must be null or a string");
  }
  if (element.link !== null && typeof element.link !== "string") {
    issues.push("link must be null or a string");
  }

  if (type === "line" || type === "arrow") {
    validateLinearElement(element, issues);
  }

  if (type === "arrow" && typeof element.elbowed !== "boolean") {
    issues.push("elbowed must be a boolean");
  }

  if (type === "freedraw") {
    validateFreedrawElement(element, issues);
  }

  if (type === "text") {
    validateTextElement(element, issues);
  }

  if (type === "image") {
    validateImageElement(element, issues);
  }

  if ((type === "frame" || type === "magicframe") && element.name !== null && typeof element.name !== "string") {
    issues.push("name must be null or a string");
  }

  return {
    id,
    type,
    issues,
  };
}

function validateLinearElement(element: Record<string, unknown>, issues: string[]): void {
  if (!Array.isArray(element.points) || !element.points.every(isPointTuple)) {
    issues.push("points must be an array of [number, number]");
  }
  if (!("lastCommittedPoint" in element) || (element.lastCommittedPoint !== null && !isPointTuple(element.lastCommittedPoint))) {
    issues.push("lastCommittedPoint must be null or [number, number]");
  }
  if (!("startBinding" in element) || (element.startBinding !== null && !isRecord(element.startBinding))) {
    issues.push("startBinding must be null or an object");
  }
  if (!("endBinding" in element) || (element.endBinding !== null && !isRecord(element.endBinding))) {
    issues.push("endBinding must be null or an object");
  }
  if (!("startArrowhead" in element) || (element.startArrowhead !== null && typeof element.startArrowhead !== "string")) {
    issues.push("startArrowhead must be null or a string");
  }
  if (!("endArrowhead" in element) || (element.endArrowhead !== null && typeof element.endArrowhead !== "string")) {
    issues.push("endArrowhead must be null or a string");
  }
}

function validateFreedrawElement(element: Record<string, unknown>, issues: string[]): void {
  if (!Array.isArray(element.points) || !element.points.every(isPointTuple)) {
    issues.push("points must be an array of [number, number]");
  }
  if (!Array.isArray(element.pressures) || !element.pressures.every(isFiniteNumber)) {
    issues.push("pressures must be an array of finite numbers");
  }
  if (typeof element.simulatePressure !== "boolean") {
    issues.push("simulatePressure must be a boolean");
  }
  if (!("lastCommittedPoint" in element) || (element.lastCommittedPoint !== null && !isPointTuple(element.lastCommittedPoint))) {
    issues.push("lastCommittedPoint must be null or [number, number]");
  }
}

function validateTextElement(element: Record<string, unknown>, issues: string[]): void {
  if (!isFiniteNumber(element.fontSize)) issues.push("fontSize must be a finite number");
  if (!isFiniteNumber(element.fontFamily)) issues.push("fontFamily must be a finite number");
  if (typeof element.text !== "string") issues.push("text must be a string");
  if (typeof element.originalText !== "string") issues.push("originalText must be a string");
  if (typeof element.textAlign !== "string") issues.push("textAlign must be a string");
  if (typeof element.verticalAlign !== "string") issues.push("verticalAlign must be a string");
  if (element.containerId !== null && typeof element.containerId !== "string") {
    issues.push("containerId must be null or a string");
  }
  if (typeof element.autoResize !== "boolean") issues.push("autoResize must be a boolean");
  if (!isFiniteNumber(element.lineHeight)) issues.push("lineHeight must be a finite number");
}

function validateImageElement(element: Record<string, unknown>, issues: string[]): void {
  if (element.fileId !== null && typeof element.fileId !== "string") {
    issues.push("fileId must be null or a string");
  }
  if (element.status !== "pending" && element.status !== "saved" && element.status !== "error") {
    issues.push("status must be pending, saved, or error");
  }
  if (!Array.isArray(element.scale) || element.scale.length !== 2 || !element.scale.every(isFiniteNumber)) {
    issues.push("scale must be [number, number]");
  }
  if (element.crop !== null && !isRecord(element.crop)) {
    issues.push("crop must be null or an object");
  }
}

function logInvalidElement(diagnostic: ElementDiagnostic, context: ValidationContext): void {
  const logKey = `${context}:${diagnostic.id ?? "unknown"}:${diagnostic.issues.join("|")}`;
  if (loggedInvalidElements.has(logKey)) {
    return;
  }

  loggedInvalidElements.add(logKey);
  console.warn("[RTDB INVALID ELEMENT]", {
    context,
    id: diagnostic.id,
    type: diagnostic.type,
    issues: diagnostic.issues,
  });
}

function isSupportedElementType(type: unknown): boolean {
  return (
    type === "selection" ||
    type === "rectangle" ||
    type === "diamond" ||
    type === "ellipse" ||
    type === "arrow" ||
    type === "line" ||
    type === "freedraw" ||
    type === "text" ||
    type === "image" ||
    type === "frame" ||
    type === "magicframe" ||
    type === "iframe" ||
    type === "embeddable"
  );
}

function isPointTuple(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every(isFiniteNumber);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const BASE_NUMBER_PROPERTIES = [
  "x",
  "y",
  "width",
  "height",
  "angle",
  "seed",
  "version",
  "versionNonce",
  "updated",
  "opacity",
  "strokeWidth",
  "roughness",
] as const;

const BASE_STRING_PROPERTIES = [
  "strokeColor",
  "backgroundColor",
  "fillStyle",
  "strokeStyle",
] as const;
