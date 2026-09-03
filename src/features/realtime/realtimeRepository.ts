import { apiClient } from "@/src/lib/apiClient";
import { getFirebaseAuth, getFirebaseRealtimeDatabase } from "../auth/firebaseClient";
import { get, ref } from "firebase/database";
import type {
  CheckpointRealtimeRoomResult,
  JoinRealtimeRoomResult,
  RealtimeAccessRecord,
  RealtimeRoomMeta,
  RealtimeRoomSnapshot,
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
};

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
