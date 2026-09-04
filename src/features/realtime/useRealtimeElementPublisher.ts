import * as React from "react";
import type { FlowBoardExcalidrawAPI } from "@/src/features/canvas/types";
import { diffRealtimeElements } from "./realtimeElementDiff";
import { realtimeRepository } from "./realtimeRepository";
import type { RealtimeCanvasElement } from "./realtime.types";
import { toRealtimeElement } from "./realtimeElementMerge";
import { filterValidRealtimeElements } from "./realtimeElementValidation";
import { logRealtimeElementsDebug } from "./realtimeElementDebug";

const PUBLISH_BATCH_DELAY_MS = 80;
const PUBLISH_RETRY_DELAY_MS = 2000;

type UseRealtimeElementPublisherOptions = {
  enabled: boolean;
  canvasId: string | null;
  excalidrawAPI: FlowBoardExcalidrawAPI | null;
  isProgrammaticUpdateRef: React.MutableRefObject<boolean>;
  onError?: (error: unknown) => void;
};

export type RealtimeElementPublisher = {
  observeLocalSceneChange: () => void;
  markRemoteElementsApplied: (elements: readonly RealtimeCanvasElement[]) => void;
  acknowledgePublishedEcho: (element: RealtimeCanvasElement) => boolean;
};

export function useRealtimeElementPublisher({
  enabled,
  canvasId,
  excalidrawAPI,
  isProgrammaticUpdateRef,
  onError,
}: UseRealtimeElementPublisherOptions): RealtimeElementPublisher {
  const excalidrawAPIRef = React.useRef(excalidrawAPI);
  const canvasIdRef = React.useRef(canvasId);
  const onErrorRef = React.useRef(onError);
  const baselineElementsRef = React.useRef<RealtimeCanvasElement[]>([]);
  const hasBaselineRef = React.useRef(false);
  const pendingChangesRef = React.useRef(new Map<string, RealtimeCanvasElement>());
  const publishTimerRef = React.useRef<number | null>(null);
  const retryTimerRef = React.useRef<number | null>(null);
  const isPublishingRef = React.useRef(false);
  const isPausedAfterPermissionErrorRef = React.useRef(false);
  const publishedEchoesRef = React.useRef(new Map<string, PublishedElementEcho>());
  const generationRef = React.useRef(0);

  excalidrawAPIRef.current = excalidrawAPI;
  canvasIdRef.current = canvasId;
  onErrorRef.current = onError;

  const isExcalidrawReady = Boolean(excalidrawAPI);

  const clearPublishTimer = React.useCallback(() => {
    if (publishTimerRef.current !== null) {
      window.clearTimeout(publishTimerRef.current);
      publishTimerRef.current = null;
    }
  }, []);

  const clearRetryTimer = React.useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const enqueueElements = React.useCallback((elements: readonly RealtimeCanvasElement[]) => {
    for (const element of elements) {
      const elementSnapshot = cloneRealtimeElement(element);
      const queuedElement = pendingChangesRef.current.get(element.id);
      if (!queuedElement || shouldReplaceQueuedElement(queuedElement, elementSnapshot)) {
        pendingChangesRef.current.set(element.id, elementSnapshot);
      }
    }
  }, []);

  const flushPendingChanges = React.useCallback(async () => {
    clearPublishTimer();

    if (
      !enabled ||
      !canvasIdRef.current ||
      isPublishingRef.current ||
      isPausedAfterPermissionErrorRef.current ||
      pendingChangesRef.current.size === 0
    ) {
      return;
    }

    const canvasIdForRequest = canvasIdRef.current;
    const generation = generationRef.current;
    const batch = Array.from(pendingChangesRef.current.values());
    pendingChangesRef.current.clear();
    isPublishingRef.current = true;
    logRealtimeElementsDebug("RTDB OUT FLUSH", batch);
    rememberPublishedEchoes(publishedEchoesRef.current, batch);

    try {
      await realtimeRepository.publishElementChanges(canvasIdForRequest, batch);
    } catch (error) {
      if (generationRef.current !== generation) {
        return;
      }

      if (isPermissionDeniedError(error)) {
        isPausedAfterPermissionErrorRef.current = true;
        onErrorRef.current?.(error);
        return;
      }

      enqueueElements(batch);
      onErrorRef.current?.(error);
      clearRetryTimer();
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        void flushPendingChanges();
      }, PUBLISH_RETRY_DELAY_MS);
      return;
    } finally {
      if (generationRef.current === generation) {
        isPublishingRef.current = false;
      }
    }

    if (generationRef.current !== generation) {
      return;
    }

    if (pendingChangesRef.current.size > 0) {
      publishTimerRef.current = window.setTimeout(() => {
        publishTimerRef.current = null;
        void flushPendingChanges();
      }, PUBLISH_BATCH_DELAY_MS);
    }
  }, [clearPublishTimer, clearRetryTimer, enabled, enqueueElements]);

  const scheduleFlush = React.useCallback(() => {
    if (publishTimerRef.current !== null || isPausedAfterPermissionErrorRef.current) {
      return;
    }

    publishTimerRef.current = window.setTimeout(() => {
      publishTimerRef.current = null;
      void flushPendingChanges();
    }, PUBLISH_BATCH_DELAY_MS);
  }, [flushPendingChanges]);

  React.useLayoutEffect(() => {
    generationRef.current += 1;
    clearPublishTimer();
    clearRetryTimer();
    pendingChangesRef.current.clear();
    isPublishingRef.current = false;
    isPausedAfterPermissionErrorRef.current = false;
    publishedEchoesRef.current.clear();

    if (!enabled || !canvasId || !isExcalidrawReady || !excalidrawAPIRef.current) {
      baselineElementsRef.current = [];
      hasBaselineRef.current = false;
      return;
    }

    baselineElementsRef.current = getRealtimeElementSnapshotsIncludingDeleted(excalidrawAPIRef.current);
    hasBaselineRef.current = true;

    return () => {
      generationRef.current += 1;
      clearPublishTimer();
      clearRetryTimer();
      pendingChangesRef.current.clear();
      isPublishingRef.current = false;
      hasBaselineRef.current = false;
      publishedEchoesRef.current.clear();
    };
  }, [canvasId, clearPublishTimer, clearRetryTimer, enabled, isExcalidrawReady]);

  const observeLocalSceneChange = React.useCallback(() => {
    if (
      !enabled ||
      !canvasIdRef.current ||
      !hasBaselineRef.current ||
      isProgrammaticUpdateRef.current ||
      isPausedAfterPermissionErrorRef.current
    ) {
      logPublisherSuppressionCheck({
        enabled,
        hasCanvasId: Boolean(canvasIdRef.current),
        hasBaseline: hasBaselineRef.current,
        programmatic: isProgrammaticUpdateRef.current,
        pausedAfterPermissionError: isPausedAfterPermissionErrorRef.current,
      });
      return;
    }

    const currentExcalidrawAPI = excalidrawAPIRef.current;
    if (!currentExcalidrawAPI) {
      return;
    }

    const previousElements = baselineElementsRef.current;
    const nextElements = getRealtimeElementSnapshotsIncludingDeleted(currentExcalidrawAPI);
    logLocalDiffReferenceDiagnostic(previousElements, nextElements);
    const diff = diffRealtimeElements(baselineElementsRef.current, nextElements);
    baselineElementsRef.current = nextElements;
    logRealtimeElementsDebug("LOCAL ONCHANGE", diff.changed);

    if (diff.changed.length === 0) {
      return;
    }

    const validChanges = filterValidRealtimeElements(diff.changed, "publish");
    if (validChanges.elements.length === 0) {
      return;
    }

    logRealtimeElementsDebug("RTDB OUT QUEUE", validChanges.elements);
    enqueueElements(validChanges.elements);
    scheduleFlush();
  }, [enabled, enqueueElements, isProgrammaticUpdateRef, scheduleFlush]);

  const markRemoteElementsApplied = React.useCallback(
    (elements: readonly RealtimeCanvasElement[]) => {
      baselineElementsRef.current = cloneRealtimeElements(elements);
      hasBaselineRef.current = true;

      for (const element of elements) {
        const queuedElement = pendingChangesRef.current.get(element.id);
        if (queuedElement && !shouldReplaceQueuedElement(element, queuedElement)) {
          pendingChangesRef.current.delete(element.id);
        }
      }
    },
    []
  );

  const acknowledgePublishedEcho = React.useCallback((element: RealtimeCanvasElement) => {
    cleanupExpiredPublishedEchoes(publishedEchoesRef.current);

    const echo = publishedEchoesRef.current.get(element.id);
    if (!echo || echo.signature !== createPublishedElementSignature(element)) {
      return false;
    }

    logRealtimeElementsDebug("RTDB SELF ECHO", [element]);
    return true;
  }, []);

  return React.useMemo(
    () => ({
      observeLocalSceneChange,
      markRemoteElementsApplied,
      acknowledgePublishedEcho,
    }),
    [acknowledgePublishedEcho, markRemoteElementsApplied, observeLocalSceneChange]
  );
}

type PublishedElementEcho = {
  signature: string;
  expiresAt: number;
};

const PUBLISHED_ECHO_TTL_MS = 10_000;

function rememberPublishedEchoes(
  publishedEchoes: Map<string, PublishedElementEcho>,
  elements: readonly RealtimeCanvasElement[]
): void {
  cleanupExpiredPublishedEchoes(publishedEchoes);
  const expiresAt = Date.now() + PUBLISHED_ECHO_TTL_MS;

  for (const element of elements) {
    publishedEchoes.set(element.id, {
      signature: createPublishedElementSignature(element),
      expiresAt,
    });
  }
}

function cleanupExpiredPublishedEchoes(publishedEchoes: Map<string, PublishedElementEcho>): void {
  const now = Date.now();
  for (const [elementId, echo] of publishedEchoes.entries()) {
    if (echo.expiresAt <= now) {
      publishedEchoes.delete(elementId);
    }
  }
}

function createPublishedElementSignature(element: RealtimeCanvasElement): string {
  return [
    element.id,
    element.version,
    element.versionNonce,
    element.updated,
  ].join(":");
}

function getRealtimeElementSnapshotsIncludingDeleted(
  excalidrawAPI: FlowBoardExcalidrawAPI
): RealtimeCanvasElement[] {
  return excalidrawAPI
    .getSceneElementsIncludingDeleted()
    .map((element) => toRealtimeElement(element))
    .filter((element): element is RealtimeCanvasElement => Boolean(element))
    .map(cloneRealtimeElement);
}

function shouldReplaceQueuedElement(
  queuedElement: RealtimeCanvasElement,
  nextElement: RealtimeCanvasElement
): boolean {
  const queuedVersion = getElementNumber(queuedElement, "version");
  const nextVersion = getElementNumber(nextElement, "version");

  if (nextVersion !== queuedVersion) {
    return nextVersion > queuedVersion;
  }

  const queuedUpdated = getElementNumber(queuedElement, "updated");
  const nextUpdated = getElementNumber(nextElement, "updated");

  if (nextUpdated !== queuedUpdated) {
    return nextUpdated > queuedUpdated;
  }

  return true;
}

function getElementNumber(
  element: RealtimeCanvasElement,
  property: "updated" | "version"
): number {
  const value = element[property];
  return typeof value === "number" ? value : 0;
}

function cloneRealtimeElements(
  elements: readonly RealtimeCanvasElement[]
): RealtimeCanvasElement[] {
  return elements.map(cloneRealtimeElement);
}

function cloneRealtimeElement(element: RealtimeCanvasElement): RealtimeCanvasElement {
  if (typeof structuredClone === "function") {
    return structuredClone(element);
  }

  return JSON.parse(JSON.stringify(element)) as RealtimeCanvasElement;
}

function isPermissionDeniedError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { code?: unknown; message?: unknown };
  const code = typeof maybeError.code === "string" ? maybeError.code.toLowerCase() : "";
  const message =
    typeof maybeError.message === "string" ? maybeError.message.toLowerCase() : "";

  return code.includes("permission_denied") || message.includes("permission_denied");
}

function logPublisherSuppressionCheck(details: {
  enabled: boolean;
  hasCanvasId: boolean;
  hasBaseline: boolean;
  programmatic: boolean;
  pausedAfterPermissionError: boolean;
}): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.info("[REMOTE SUPPRESSION CHECK]", {
    ...details,
    reason: getPublisherSuppressionReason(details),
  });
}

function getPublisherSuppressionReason(details: {
  enabled: boolean;
  hasCanvasId: boolean;
  hasBaseline: boolean;
  programmatic: boolean;
  pausedAfterPermissionError: boolean;
}): string {
  if (!details.enabled) return "publisher-disabled";
  if (!details.hasCanvasId) return "missing-canvas-id";
  if (!details.hasBaseline) return "missing-baseline";
  if (details.programmatic) return "programmatic-update";
  if (details.pausedAfterPermissionError) return "permission-denied-pause";
  return "none";
}

function logLocalDiffReferenceDiagnostic(
  previousElements: readonly RealtimeCanvasElement[],
  nextElements: readonly RealtimeCanvasElement[]
): void {
  if (!import.meta.env.DEV || previousElements.length === 0 || nextElements.length === 0) {
    return;
  }

  const previousById = new Map(previousElements.map((element) => [element.id, element]));
  const changedGeometryElement = nextElements.find((nextElement) => {
    const previousElement = previousById.get(nextElement.id);
    return Boolean(
      previousElement &&
        (previousElement.x !== nextElement.x ||
          previousElement.y !== nextElement.y ||
          previousElement.width !== nextElement.width ||
          previousElement.height !== nextElement.height ||
          previousElement.version !== nextElement.version)
    );
  });

  if (!changedGeometryElement) {
    return;
  }

  const previousElement = previousById.get(changedGeometryElement.id);
  console.info("[LOCAL DIFF BASELINE]", {
    id: changedGeometryElement.id,
    baselineSameReference: previousElement === changedGeometryElement,
    baselineX: previousElement?.x ?? null,
    currentX: changedGeometryElement.x,
    baselineY: previousElement?.y ?? null,
    currentY: changedGeometryElement.y,
    baselineWidth: previousElement?.width ?? null,
    currentWidth: changedGeometryElement.width,
    baselineHeight: previousElement?.height ?? null,
    currentHeight: changedGeometryElement.height,
    baselineVersion: previousElement?.version ?? null,
    currentVersion: changedGeometryElement.version,
  });
}
