import { randomUUID } from "node:crypto";
import type { DataSnapshot, Reference } from "firebase-admin/database";
import { getFirebaseAdminDatabase } from "../auth/firebaseAdmin.js";
import type { Canvas, CanvasSceneData } from "../canvas/canvas.types.js";
import type {
  RealtimeAccessRecord,
  RealtimeCanvasPermission,
  RealtimeRoomMeta,
} from "./realtime.types.js";

const ROOM_INITIALIZATION_STALE_MS = 30_000;
const ROOM_READY_WAIT_MS = 5_000;
const ROOM_READY_POLL_MS = 250;

type SeedRoomResult = {
  status: "ready";
  skippedFileCount: number;
};

export const realtimeRepository = {
  async grantCanvasAccess(
    canvasId: string,
    uid: string,
    access: Omit<RealtimeAccessRecord, "grantedAt">
  ): Promise<void> {
    await getFirebaseAdminDatabase()
      .ref(`realtime/access/${canvasId}/${uid}`)
      .set({
        ...access,
        shareId: access.shareId ?? null,
        grantedAt: Date.now(),
      });
  },

  async updateShareAccessPermission(
    canvasId: string,
    shareId: string,
    permission: RealtimeCanvasPermission
  ): Promise<void> {
    const snapshot = await getFirebaseAdminDatabase()
      .ref(`realtime/access/${canvasId}`)
      .get();
    const updates = collectShareAccessUpdates(canvasId, snapshot, shareId, permission);

    if (Object.keys(updates).length > 0) {
      await getFirebaseAdminDatabase().ref().update(updates);
    }
  },

  async removeShareAccess(canvasId: string, shareId: string): Promise<void> {
    const snapshot = await getFirebaseAdminDatabase()
      .ref(`realtime/access/${canvasId}`)
      .get();
    const removals = collectShareAccessRemovals(canvasId, snapshot, shareId);

    if (Object.keys(removals).length > 0) {
      await getFirebaseAdminDatabase().ref().update(removals);
    }
  },

  async removeCanvasRealtimeData(canvasId: string): Promise<void> {
    await getFirebaseAdminDatabase().ref().update({
      [`realtime/access/${canvasId}`]: null,
      [`realtime/canvases/${canvasId}`]: null,
    });
  },

  async ensureCanvasRoomReady(canvas: Pick<Canvas, "id" | "sceneData">): Promise<SeedRoomResult> {
    const database = getFirebaseAdminDatabase();
    const roomRef = database.ref(`realtime/canvases/${canvas.id}`);
    const metaRef = roomRef.child("meta");
    const startedAt = Date.now();

    while (Date.now() - startedAt < ROOM_READY_WAIT_MS) {
      const initializationId = randomUUID();
      const claim = await metaRef.transaction((current: RealtimeRoomMeta | null) => {
        const now = Date.now();

        if (current?.status === "ready") {
          return;
        }

        if (
          current?.status === "initializing" &&
          typeof current.initializationStartedAt === "number" &&
          now - current.initializationStartedAt < ROOM_INITIALIZATION_STALE_MS
        ) {
          return;
        }

        return {
          status: "initializing",
          initializationStartedAt: now,
          initializedFromRevision: 0,
          initializationId,
        } satisfies RealtimeRoomMeta;
      });

      const claimedMeta = claim.snapshot.val() as RealtimeRoomMeta | null;

      if (claimedMeta?.status === "ready") {
        return {
          status: "ready",
          skippedFileCount: countSceneFiles(canvas.sceneData),
        };
      }

      if (claim.committed && claimedMeta?.initializationId === initializationId) {
        return seedClaimedRoom(roomRef, metaRef, canvas.sceneData, claimedMeta, initializationId);
      }

      const ready = await waitForReadyRoom(metaRef);
      if (ready) {
        return {
          status: "ready",
          skippedFileCount: countSceneFiles(canvas.sceneData),
        };
      }
    }

    throw new Error("Realtime room initialization timed out");
  },
};

async function seedClaimedRoom(
  roomRef: Reference,
  metaRef: Reference,
  sceneData: CanvasSceneData,
  claimedMeta: RealtimeRoomMeta,
  initializationId: string
): Promise<SeedRoomResult> {
  const currentMeta = (await metaRef.get()).val() as RealtimeRoomMeta | null;

  if (currentMeta?.status === "ready") {
    return {
      status: "ready",
      skippedFileCount: countSceneFiles(sceneData),
    };
  }

  if (currentMeta?.status !== "initializing" || currentMeta.initializationId !== initializationId) {
    const becameReady = await waitForReadyRoom(metaRef);
    if (becameReady) {
      return {
        status: "ready",
        skippedFileCount: countSceneFiles(sceneData),
      };
    }

    throw new Error("Realtime room initialization was superseded");
  }

  const skippedFileCount = countSceneFiles(sceneData);

  await roomRef.update({
    elements: mapElementsById(sceneData.elements),
    files: {},
    meta: {
      status: "ready",
      initializationStartedAt: claimedMeta.initializationStartedAt ?? Date.now(),
      initializedAt: Date.now(),
      initializedFromRevision: 0,
      initializationId,
    } satisfies RealtimeRoomMeta,
  });

  return {
    status: "ready",
    skippedFileCount,
  };
}

async function waitForReadyRoom(
  metaRef: Reference
): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < ROOM_READY_WAIT_MS) {
    const meta = (await metaRef.get()).val() as RealtimeRoomMeta | null;
    if (meta?.status === "ready") {
      return true;
    }

    if (
      meta?.status === "initializing" &&
      typeof meta.initializationStartedAt === "number" &&
      Date.now() - meta.initializationStartedAt >= ROOM_INITIALIZATION_STALE_MS
    ) {
      return false;
    }

    await delay(ROOM_READY_POLL_MS);
  }

  return false;
}

function mapElementsById(elements: unknown[]): Record<string, unknown> {
  const elementMap: Record<string, unknown> = {};

  for (const element of elements) {
    if (!isRecord(element) || typeof element.id !== "string" || element.id.trim().length === 0) {
      continue;
    }

    elementMap[element.id] = element;
  }

  return elementMap;
}

function collectShareAccessUpdates(
  canvasId: string,
  snapshot: DataSnapshot,
  shareId: string,
  permission: RealtimeCanvasPermission
): Record<string, RealtimeCanvasPermission> {
  const updates: Record<string, RealtimeCanvasPermission> = {};

  snapshot.forEach((child) => {
    const access = child.val() as RealtimeAccessRecord | null;
    if (child.key && access?.source === "share" && access.shareId === shareId) {
      updates[`realtime/access/${canvasId}/${child.key}/permission`] = permission;
    }
  });

  return updates;
}

function collectShareAccessRemovals(
  canvasId: string,
  snapshot: DataSnapshot,
  shareId: string
): Record<string, null> {
  const removals: Record<string, null> = {};

  snapshot.forEach((child) => {
    const access = child.val() as RealtimeAccessRecord | null;
    if (child.key && access?.source === "share" && access.shareId === shareId) {
      removals[`realtime/access/${canvasId}/${child.key}`] = null;
    }
  });

  return removals;
}

function countSceneFiles(sceneData: CanvasSceneData): number {
  return Object.keys(sceneData.files).length;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
