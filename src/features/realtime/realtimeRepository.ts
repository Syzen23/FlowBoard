import { apiClient } from "@/src/lib/apiClient";
import { getFirebaseAuth, getFirebaseRealtimeDatabase } from "../auth/firebaseClient";
import {
  get,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  ref,
  update,
  type DataSnapshot,
} from "firebase/database";
import type {
  CheckpointRealtimeRoomResult,
  JoinRealtimeRoomResult,
  PublishRealtimeElementsResult,
  RealtimeAccessRecord,
  RealtimeCanvasElement,
  RealtimeElementSubscriptionHandlers,
  RealtimeRoomMeta,
  RealtimeRoomSnapshot,
  RealtimeUnsubscribe,
} from "./realtime.types";

export const realtimeRepository = {
  joinOwnerRoom(canvasId: string): Promise<JoinRealtimeRoomResult> {
    return apiClient.post<JoinRealtimeRoomResult, Record<string, never>>(
      `/realtime/canvases/${encodeURIComponent(canvasId)}/join`,
      {}
    );
  },

  joinSharedRoom(token: string): Promise<JoinRealtimeRoomResult> {
    return apiClient.post<JoinRealtimeRoomResult, Record<string, never>>(
      `/realtime/shares/${encodeURIComponent(token)}/join`,
      {}
    );
  },

  checkpointOwnerRoom(canvasId: string): Promise<CheckpointRealtimeRoomResult> {
    return apiClient.post<CheckpointRealtimeRoomResult, Record<string, never>>(
      `/realtime/canvases/${encodeURIComponent(canvasId)}/checkpoint`,
      {}
    );
  },

  checkpointSharedRoom(token: string): Promise<CheckpointRealtimeRoomResult> {
    return apiClient.post<CheckpointRealtimeRoomResult, Record<string, never>>(
      `/realtime/shares/${encodeURIComponent(token)}/checkpoint`,
      {}
    );
  },

  async getRealtimeAccess(canvasId: string): Promise<RealtimeAccessRecord | null> {
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) {
      return null;
    }

    const snapshot = await get(ref(getFirebaseRealtimeDatabase(), `realtime/access/${canvasId}/${uid}`));
    return snapshot.exists() ? normalizeAccessRecord(snapshot.val()) : null;
  },

  async getRealtimeRoomSnapshot(canvasId: string): Promise<RealtimeRoomSnapshot> {
    const database = getFirebaseRealtimeDatabase();
    const [metaSnapshot, elementsSnapshot] = await Promise.all([
      get(ref(database, `realtime/canvases/${canvasId}/meta`)),
      get(ref(database, `realtime/canvases/${canvasId}/elements`)),
    ]);

    return normalizeRoomSnapshot({
      meta: metaSnapshot.val(),
      elements: elementsSnapshot.val(),
    });
  },

  subscribeToElements(
    canvasId: string,
    handlers: RealtimeElementSubscriptionHandlers
  ): RealtimeUnsubscribe {
    const elementsRef = ref(
      getFirebaseRealtimeDatabase(),
      `realtime/canvases/${canvasId}/elements`
    );

    const handleError = (error: Error) => {
      handlers.onError?.(error);
    };

    const unsubscribeAdded = onChildAdded(
      elementsRef,
      (snapshot) => {
        const element = snapshotToRealtimeElement(snapshot);
        if (element) {
          handlers.onAdded(element);
        }
      },
      handleError
    );

    const unsubscribeChanged = onChildChanged(
      elementsRef,
      (snapshot) => {
        const element = snapshotToRealtimeElement(snapshot);
        if (element) {
          handlers.onChanged(element);
        }
      },
      handleError
    );

    const unsubscribeRemoved = onChildRemoved(
      elementsRef,
      (snapshot) => {
        const elementId = snapshot.key;
        if (typeof elementId === "string") {
          handlers.onRemoved?.(elementId);
        }
      },
      handleError
    );

    let isUnsubscribed = false;
    return () => {
      if (isUnsubscribed) {
        return;
      }

      isUnsubscribed = true;
      unsubscribeAdded();
      unsubscribeChanged();
      unsubscribeRemoved();
    };
  },

  async publishElementChanges(
    canvasId: string,
    elements: readonly unknown[]
  ): Promise<PublishRealtimeElementsResult> {
    const updates: Record<string, unknown> = {};
    let skippedInvalidCount = 0;

    for (const element of elements) {
      const elementId = getRealtimeElementId(element);
      if (!elementId) {
        skippedInvalidCount += 1;
        continue;
      }

      const jsonSafeElement = toRealtimeJsonValue(element);
      if (!isRecord(jsonSafeElement) || jsonSafeElement.id !== elementId) {
        skippedInvalidCount += 1;
        continue;
      }

      updates[elementId] = jsonSafeElement;
    }

    const publishedCount = Object.keys(updates).length;
    if (publishedCount > 0) {
      await update(
        ref(getFirebaseRealtimeDatabase(), `realtime/canvases/${canvasId}/elements`),
        updates
      );
    }

    return {
      publishedCount,
      skippedInvalidCount,
    };
  },
};

function snapshotToRealtimeElement(snapshot: DataSnapshot): RealtimeCanvasElement | null {
  const elementId = snapshot.key;
  const value = snapshot.val();

  if (typeof elementId !== "string" || !isRecord(value) || value.id !== elementId) {
    return null;
  }

  return value as unknown as RealtimeCanvasElement;
}

function getRealtimeElementId(element: unknown): string | null {
  if (!isRecord(element) || typeof element.id !== "string" || element.id.trim().length === 0) {
    return null;
  }

  return element.id;
}

function toRealtimeJsonValue(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map(toRealtimeJsonValue);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((result, [key, childValue]) => {
    if (childValue !== undefined) {
      result[key] = toRealtimeJsonValue(childValue);
    }

    return result;
  }, {});
}

function normalizeAccessRecord(value: unknown): RealtimeAccessRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const permission = value.permission;
  const source = value.source;
  const shareId = value.shareId;
  const grantedAt = value.grantedAt;

  if (
    (permission !== "view" && permission !== "edit") ||
    (source !== "owner" && source !== "share") ||
    typeof grantedAt !== "number"
  ) {
    return null;
  }

  return {
    permission,
    source,
    shareId: typeof shareId === "string" ? shareId : null,
    grantedAt,
  };
}

function normalizeRoomSnapshot(value: unknown): RealtimeRoomSnapshot {
  if (!isRecord(value)) {
    return {
      meta: null,
      elements: {},
      files: {},
    };
  }

  return {
    meta: normalizeRoomMeta(value.meta),
    elements: isRecord(value.elements) ? value.elements : {},
    files: isRecord(value.files) ? value.files : {},
  };
}

function normalizeRoomMeta(value: unknown): RealtimeRoomMeta | null {
  if (!isRecord(value)) {
    return null;
  }

  const status = value.status;
  const initializedFromRevision = value.initializedFromRevision;

  if ((status !== "initializing" && status !== "ready") || typeof initializedFromRevision !== "number") {
    return null;
  }

  return {
    status,
    initializedFromRevision,
    initializationStartedAt:
      typeof value.initializationStartedAt === "number" ? value.initializationStartedAt : undefined,
    initializedAt: typeof value.initializedAt === "number" ? value.initializedAt : undefined,
    initializationId: typeof value.initializationId === "string" ? value.initializationId : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
