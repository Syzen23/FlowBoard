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
  onError?: (error: unknown) => void;
};

export function useRealtimeElementReceiver({
  enabled,
  roomKey,
  excalidrawAPI,
  joinRoom,
  isProgrammaticUpdateRef,
  onRemoteElementsApplied,
  onError,
}: UseRealtimeElementReceiverOptions): void {
  const generationRef = React.useRef(0);
  const excalidrawAPIRef = React.useRef(excalidrawAPI);
  const joinRoomRef = React.useRef(joinRoom);
  const onRemoteElementsAppliedRef = React.useRef(onRemoteElementsApplied);
  const onErrorRef = React.useRef(onError);

  excalidrawAPIRef.current = excalidrawAPI;
  joinRoomRef.current = joinRoom;
  onRemoteElementsAppliedRef.current = onRemoteElementsApplied;
  onErrorRef.current = onError;

  const isExcalidrawReady = Boolean(excalidrawAPI);

  React.useEffect(() => {
    if (!enabled || !roomKey || !isExcalidrawReady) {
      return;
    }

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

    const applyElements = (incomingElements: readonly RealtimeCanvasElement[]) => {
      if (!isCurrentGeneration() || incomingElements.length === 0) {
        return;
      }

      const currentExcalidrawAPI = excalidrawAPIRef.current;
      if (!currentExcalidrawAPI) {
        return;
      }

      const mergeResult = mergeRealtimeElements(
        currentExcalidrawAPI.getSceneElementsIncludingDeleted(),
        incomingElements,
        currentExcalidrawAPI.getAppState()
      );

      if (!mergeResult.changed) {
        return;
      }

      onRemoteElementsAppliedRef.current?.(mergeResult.elements, currentExcalidrawAPI.getFiles());
      isProgrammaticUpdateRef.current = true;
      currentExcalidrawAPI.updateScene({
        elements: mergeResult.elements,
      });

      window.setTimeout(() => {
        if (generationRef.current === generation) {
          isProgrammaticUpdateRef.current = false;
        }
      }, 150);
    };

    const scheduleElements = (incomingElements: readonly RealtimeCanvasElement[]) => {
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
        applyElements(pendingElements);
      }, 16);
    };

    async function initializeReceiver() {
      try {
        const joinedRoom = await joinRoomRef.current();
        if (!isCurrentGeneration()) return;

        unsubscribe = realtimeRepository.subscribeToElements(joinedRoom.canvasId, {
          onAdded: (element) => {
            if (!isCurrentGeneration()) return;
            if (isHydrating) {
              hydrationBuffer.push(element);
              return;
            }

            scheduleElements([element]);
          },
          onChanged: (element) => {
            if (!isCurrentGeneration()) return;
            if (isHydrating) {
              hydrationBuffer.push(element);
              return;
            }

            scheduleElements([element]);
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
        applyElements(initialRemoteState);
      } catch (error) {
        if (isCurrentGeneration()) {
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
}

export function createRealtimeElementsFingerprint(elements: readonly RealtimeCanvasElement[]): string {
  return createElementsFingerprint(elements);
}
