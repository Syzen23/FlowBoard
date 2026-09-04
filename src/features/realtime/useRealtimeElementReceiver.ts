import * as React from "react";
import type { FlowBoardExcalidrawAPI } from "@/src/features/canvas/types";
import type { FlowBoardCanvasFiles } from "@/src/features/canvas/types";
import { realtimeRepository } from "./realtimeRepository";
import type {
  JoinRealtimeRoomResult,
  RealtimeCanvasElement,
  RealtimeUnsubscribe,
} from "./realtime.types";
import {
  createElementsFingerprint,
  mergeRealtimeElements,
  toRealtimeElement,
} from "./realtimeElementMerge";
import { prepareRealtimeElementsForScene } from "./realtimeElementValidation";
import {
  getRealtimeElementDebugFields,
  logRealtimeElementsDebug,
} from "./realtimeElementDebug";

type UseRealtimeElementReceiverOptions = {
  enabled: boolean;
  roomKey: string | null;
  excalidrawAPI: FlowBoardExcalidrawAPI | null;
  joinRoom: () => Promise<JoinRealtimeRoomResult>;
  isProgrammaticUpdateRef: React.MutableRefObject<boolean>;
  onRemoteElementsApplied?: (
    elements: readonly RealtimeCanvasElement[],
    files: FlowBoardCanvasFiles
  ) => void;
  shouldIgnoreIncomingElement?: (element: RealtimeCanvasElement) => boolean;
  onError?: (error: unknown) => void;
};

type RealtimeApplySource = "hydrate" | "live-added" | "live-changed";

export function useRealtimeElementReceiver({
  enabled,
  roomKey,
  excalidrawAPI,
  joinRoom,
  isProgrammaticUpdateRef,
  onRemoteElementsApplied,
  shouldIgnoreIncomingElement,
  onError,
}: UseRealtimeElementReceiverOptions): RealtimeReceiverStatus {
  const [status, setStatus] = React.useState<RealtimeReceiverStatus>("idle");
  const generationRef = React.useRef(0);
  const excalidrawAPIRef = React.useRef(excalidrawAPI);
  const joinRoomRef = React.useRef(joinRoom);
  const onRemoteElementsAppliedRef = React.useRef(onRemoteElementsApplied);
  const shouldIgnoreIncomingElementRef = React.useRef(shouldIgnoreIncomingElement);
  const onErrorRef = React.useRef(onError);

  excalidrawAPIRef.current = excalidrawAPI;
  joinRoomRef.current = joinRoom;
  onRemoteElementsAppliedRef.current = onRemoteElementsApplied;
  shouldIgnoreIncomingElementRef.current = shouldIgnoreIncomingElement;
  onErrorRef.current = onError;

  const isExcalidrawReady = Boolean(excalidrawAPI);

  React.useEffect(() => {
    if (!enabled || !roomKey || !isExcalidrawReady) {
      setStatus("idle");
      return;
    }

    setStatus("joining");
    let isActive = true;
    let isHydrating = true;
    let unsubscribe: RealtimeUnsubscribe | null = null;
    let renderTimer: number | null = null;
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const hydrationBuffer: RealtimeCanvasElement[] = [];
    const pendingElementsById = new Map<string, RealtimeCanvasElement>();

    const isCurrentGeneration = () => {
      return isActive && generationRef.current === generation;
    };

    const clearRenderTimer = () => {
      if (renderTimer !== null) {
        window.clearTimeout(renderTimer);
        renderTimer = null;
      }
    };

    const applyElements = (
      incomingElements: readonly RealtimeCanvasElement[],
      source: RealtimeApplySource
    ) => {
      if (!isCurrentGeneration() || incomingElements.length === 0) {
        return;
      }

      const currentExcalidrawAPI = excalidrawAPIRef.current;
      if (!currentExcalidrawAPI) {
        return;
      }

      const currentElements = currentExcalidrawAPI.getSceneElementsIncludingDeleted();
      const preparedIncoming = prepareRealtimeElementsForScene(incomingElements, currentElements);
      if (preparedIncoming.elements.length === 0) {
        return;
      }
      logRealtimeElementsDebug(`RTDB RESTORED ${source}`, preparedIncoming.elements);

      const mergeResult = mergeRealtimeElements(
        currentElements,
        preparedIncoming.elements,
        currentExcalidrawAPI.getAppState()
      );
      logRealtimeMergeDecisions(currentElements, preparedIncoming.elements, mergeResult.elements);

      const newRemoteElementIds = getNewRemoteElementIds(currentElements, mergeResult.elements);
      if (newRemoteElementIds.length > 0) {
        logRealtimeElementsDebug(
          `REMOTE MERGE ADD ${source}`,
          mergeResult.elements.filter((element) => newRemoteElementIds.includes(element.id))
        );
      }

      if (!mergeResult.changed) {
        return;
      }

      const preparedMerged = prepareRealtimeElementsForScene(mergeResult.elements, currentElements);
      const finalElements = mergeRealtimeElements(
        preparedMerged.elements,
        preparedIncoming.elements
      ).elements;

      if (finalElements.length === 0) {
        return;
      }
      logRealtimeElementsDebug(
        `REMOTE APPLY ${source}`,
        finalElements.filter((element) =>
          preparedIncoming.elements.some((incomingElement) => incomingElement.id === element.id)
        )
      );

      onRemoteElementsAppliedRef.current?.(finalElements, currentExcalidrawAPI.getFiles());
      isProgrammaticUpdateRef.current = true;
      currentExcalidrawAPI.updateScene({
        elements: finalElements,
      });

      window.setTimeout(() => {
        if (generationRef.current === generation) {
          isProgrammaticUpdateRef.current = false;
        }
      }, 150);
    };

    const scheduleElements = (
      incomingElements: readonly RealtimeCanvasElement[],
      source: Exclude<RealtimeApplySource, "hydrate">
    ) => {
      if (!isCurrentGeneration()) {
        return;
      }

      for (const element of incomingElements) {
        pendingElementsById.set(element.id, element);
      }

      if (renderTimer !== null) {
        return;
      }

      renderTimer = window.setTimeout(() => {
        renderTimer = null;
        const pendingElements = Array.from(pendingElementsById.values());
        pendingElementsById.clear();
        applyElements(pendingElements, source);
      }, 16);
    };

    async function initializeReceiver() {
      try {
        const joinedRoom = await joinRoomRef.current();
        if (!isCurrentGeneration()) return;

        setStatus("hydrating");
        unsubscribe = realtimeRepository.subscribeToElements(joinedRoom.canvasId, {
          onAdded: (element) => {
            if (!isCurrentGeneration()) return;
            if (shouldIgnoreIncomingElementRef.current?.(element)) return;
            if (isHydrating) {
              hydrationBuffer.push(element);
              return;
            }

            scheduleElements([element], "live-added");
          },
          onChanged: (element) => {
            if (!isCurrentGeneration()) return;
            if (shouldIgnoreIncomingElementRef.current?.(element)) return;
            if (isHydrating) {
              hydrationBuffer.push(element);
              return;
            }

            scheduleElements([element], "live-changed");
          },
          onRemoved: () => {
            // Excalidraw deletions are represented as isDeleted tombstones.
          },
          onError: (error) => {
            if (isCurrentGeneration()) {
              onErrorRef.current?.(error);
            }
          },
        });

        const snapshot = await realtimeRepository.getRealtimeRoomSnapshot(joinedRoom.canvasId);
        if (!isCurrentGeneration()) return;

        const snapshotElements = Object.entries(snapshot.elements)
          .map(([elementId, value]) => toRealtimeElement(value, elementId))
          .filter((element): element is RealtimeCanvasElement => Boolean(element));

        const initialRemoteState = mergeRealtimeElements(snapshotElements, hydrationBuffer).elements;
        isHydrating = false;
        applyElements(initialRemoteState, "hydrate");
        if (isCurrentGeneration()) {
          setStatus("ready");
        }
      } catch (error) {
        if (isCurrentGeneration()) {
          setStatus("error");
          onErrorRef.current?.(error);
        }
      }
    }

    void initializeReceiver();

    return () => {
      isActive = false;
      generationRef.current += 1;
      clearRenderTimer();
      pendingElementsById.clear();
      hydrationBuffer.length = 0;
      unsubscribe?.();
    };
  }, [
    enabled,
    isExcalidrawReady,
    isProgrammaticUpdateRef,
    roomKey,
  ]);

  return status;
}

export function createRealtimeElementsFingerprint(elements: readonly RealtimeCanvasElement[]): string {
  return createElementsFingerprint(elements);
}

export type RealtimeReceiverStatus = "idle" | "joining" | "hydrating" | "ready" | "error";

function getNewRemoteElementIds(
  currentElements: readonly unknown[],
  mergedElements: readonly RealtimeCanvasElement[]
): string[] {
  const currentIds = new Set<string>();
  for (const element of currentElements) {
    const realtimeElement = toRealtimeElement(element);
    if (realtimeElement) {
      currentIds.add(realtimeElement.id);
    }
  }

  return mergedElements
    .filter((element) => !currentIds.has(element.id))
    .map((element) => element.id);
}

function logRealtimeMergeDecisions(
  currentElements: readonly unknown[],
  incomingElements: readonly RealtimeCanvasElement[],
  mergedElements: readonly RealtimeCanvasElement[]
): void {
  if (!import.meta.env.DEV) {
    return;
  }

  const currentById = new Map<string, RealtimeCanvasElement>();
  const mergedById = new Map<string, RealtimeCanvasElement>();

  for (const currentElement of currentElements) {
    const realtimeElement = toRealtimeElement(currentElement);
    if (realtimeElement) {
      currentById.set(realtimeElement.id, realtimeElement);
    }
  }

  for (const mergedElement of mergedElements) {
    mergedById.set(mergedElement.id, mergedElement);
  }

  for (const incomingElement of incomingElements) {
    const localElement = currentById.get(incomingElement.id);
    const mergedElement = mergedById.get(incomingElement.id);
    console.info("[REMOTE MERGE]", {
      ...getRealtimeElementDebugFields(incomingElement),
      localVersion: localElement?.version ?? null,
      localVersionNonce: localElement?.versionNonce ?? null,
      incomingVersion: incomingElement.version,
      incomingVersionNonce: incomingElement.versionNonce,
      decision: getMergeDecision(localElement, incomingElement, mergedElement),
    });
  }
}

function getMergeDecision(
  localElement: RealtimeCanvasElement | undefined,
  incomingElement: RealtimeCanvasElement,
  mergedElement: RealtimeCanvasElement | undefined
): "incoming" | "local" | "identical" | "missing" {
  if (!mergedElement) {
    return "missing";
  }

  if (!localElement) {
    return "incoming";
  }

  if (createElementsFingerprint([localElement]) === createElementsFingerprint([incomingElement])) {
    return "identical";
  }

  if (createElementsFingerprint([mergedElement]) === createElementsFingerprint([incomingElement])) {
    return "incoming";
  }

  return "local";
}
