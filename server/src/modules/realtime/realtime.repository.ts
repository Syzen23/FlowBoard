import { randomUUID } from "node:crypto";
import type { DataSnapshot, Reference } from "firebase-admin/database";
import { getFirebaseAdminDatabase } from "../auth/firebaseAdmin.js";
import type { Canvas, CanvasSceneData } from "../canvas/canvas.types.js";
import type {
  RealtimeAccessRecord,
  RealtimeCanvasPermission,
  RealtimeCheckpointLease,
  RealtimeRoomData,
  RealtimeRoomMeta,
} from "./realtime.types.js";

const ROOM_INITIALIZATION_STALE_MS = 30_000;
const ROOM_READY_WAIT_MS = 5_000;
const ROOM_READY_POLL_MS = 250;
const CHECKPOINT_LEASE_STALE_MS = 30_000;

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

  async ensureCanvasRoomReady(
    canvas: Pick<Canvas, "id" | "sceneData" | "sceneRevision">
  ): Promise<SeedRoomResult> {
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
          initializedFromRevision: canvas.sceneRevision,
          lastCheckpointRevision: canvas.sceneRevision,
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

  async readReadyCanvasRoom(canvasId: string): Promise<RealtimeRoomData | null> {
    const roomRef = getFirebaseAdminDatabase().ref(`realtime/canvases/${canvasId}`);
    const [metaSnapshot, elementsSnapshot] = await Promise.all([
      roomRef.child("meta").get(),
      roomRef.child("elements").get(),
    ]);
    const meta = metaSnapshot.val() as RealtimeRoomMeta | null;

    if (!meta || meta.status !== "ready") {
      return null;
    }

    return {
      meta,
      elements: normalizeElementsMap(elementsSnapshot.val()),
    };
  },

  async claimCheckpointLease(canvasId: string): Promise<RealtimeCheckpointLease | null> {
    const leaseId = randomUUID();
    const startedAt = Date.now();
    const leaseRef = getFirebaseAdminDatabase().ref(`realtime/canvases/${canvasId}/meta/checkpoint`);
    const result = await leaseRef.transaction((current: RealtimeCheckpointLease | null) => {
      if (
        current?.status === "running" &&
        typeof current.startedAt === "number" &&
        startedAt - current.startedAt < CHECKPOINT_LEASE_STALE_MS
      ) {
        return;
      }

      return {
        id: leaseId,
        status: "running",
        startedAt,
      } satisfies RealtimeCheckpointLease;
    });

    const lease = result.snapshot.val() as RealtimeCheckpointLease | null;
    return result.committed && lease?.id === leaseId ? lease : null;
  },

  async releaseCheckpointLease(
    canvasId: string,
    lease: RealtimeCheckpointLease,
    checkpoint: { sceneRevision: number; checkpointedAt: string }
  ): Promise<boolean> {
    const metaRef = getFirebaseAdminDatabase().ref(`realtime/canvases/${canvasId}/meta`);
    const checkpointedAt = Date.parse(checkpoint.checkpointedAt);

    if (!Number.isFinite(checkpointedAt)) {
      throw new Error("Checkpoint timestamp is invalid");
    }

    if (isCheckpointFinalized((await metaRef.get()).val(), checkpoint.sceneRevision)) {
      return true;
    }

    let transactionCurrentSummary: CheckpointTransactionSummary | null = null;
    const finalizeTransaction = createFinalizeCheckpointMetaTransactionUpdate(
      lease,
      checkpoint.sceneRevision,
      checkpointedAt
    );
    const result = await metaRef.transaction((current: RealtimeRoomMeta | null) => {
      transactionCurrentSummary = createCheckpointTransactionSummary(current, lease, checkpoint.sceneRevision);
      return finalizeTransaction(current);
    });

    const finalMeta = result.snapshot.val() as RealtimeRoomMeta | null;
    const finalized = result.committed && isCheckpointFinalized(finalMeta, checkpoint.sceneRevision);

    if (!finalized) {
      logCheckpointTransactionDiagnostic("finalize", {
        expectedLeaseId: lease.id,
        transactionCommitted: result.committed,
        before: transactionCurrentSummary,
        after: createCheckpointTransactionSummary(finalMeta, lease, checkpoint.sceneRevision),
      });
    }

    if (finalized) {
      return true;
    }

    const currentMeta = (await metaRef.get()).val();
    if (isCheckpointFinalized(currentMeta, checkpoint.sceneRevision)) {
      return true;
    }

    logCheckpointTransactionDiagnostic("finalize-readback", {
      expectedLeaseId: lease.id,
      transactionCommitted: result.committed,
      before: transactionCurrentSummary,
      after: createCheckpointTransactionSummary(currentMeta, lease, checkpoint.sceneRevision),
    });

    return false;
  },

  async clearCheckpointLease(canvasId: string, lease: RealtimeCheckpointLease): Promise<boolean> {
    const metaRef = getFirebaseAdminDatabase().ref(`realtime/canvases/${canvasId}/meta`);
    let transactionCurrentSummary: CheckpointTransactionSummary | null = null;
    const clearTransaction = createClearCheckpointLeaseMetaTransactionUpdate(lease);
    const result = await metaRef.transaction((current: RealtimeRoomMeta | null) => {
      transactionCurrentSummary = createCheckpointTransactionSummary(current, lease, null);
      return clearTransaction(current);
    });

    const finalMeta = result.snapshot.val() as RealtimeRoomMeta | null;
    if (result.committed || !isOwnedCheckpointMeta(finalMeta, lease)) {
      return true;
    }

    const currentMeta = (await metaRef.get()).val();
    const released = !isOwnedCheckpointMeta(currentMeta, lease);

    if (!released) {
      logCheckpointTransactionDiagnostic("cleanup", {
        expectedLeaseId: lease.id,
        transactionCommitted: result.committed,
        before: transactionCurrentSummary,
        after: createCheckpointTransactionSummary(currentMeta, lease, null),
      });
    }

    return released;
  },
};

export function createFinalizeCheckpointMetaTransactionUpdate(
  lease: RealtimeCheckpointLease,
  sceneRevision: number,
  checkpointedAt: number
): (current: RealtimeRoomMeta | null) => RealtimeRoomMeta | null | undefined {
  return (current) => {
    if (current === null) {
      return current;
    }

    if (!isReadyOwnedCheckpointMeta(current, lease)) {
      return;
    }

    const nextMeta: RealtimeRoomMeta = {
      ...current,
      lastCheckpointRevision: sceneRevision,
      lastCheckpointAt: checkpointedAt,
    };
    delete nextMeta.checkpoint;

    return nextMeta;
  };
}

export function createClearCheckpointLeaseMetaTransactionUpdate(
  lease: RealtimeCheckpointLease
): (current: RealtimeRoomMeta | null) => RealtimeRoomMeta | null | undefined {
  return (current) => {
    if (current === null) {
      return current;
    }

    if (!isOwnedCheckpointMeta(current, lease)) {
      return;
    }

    const nextMeta: RealtimeRoomMeta = {
      ...current,
    };
    delete nextMeta.checkpoint;

    return nextMeta;
  };
}

type CheckpointTransactionSummary = {
  expectedLeaseId: string;
  currentLeaseId: string | null;
  currentCheckpointStatus: string | null;
  roomStatus: string | null;
  initializedFromRevision: number | null;
  lastCheckpointRevision: number | null;
  postgresSceneRevision: number | null;
};

function isOwnedCheckpointMeta(value: unknown, lease: RealtimeCheckpointLease): value is RealtimeRoomMeta {
  return isRecord(value) && isRecord(value.checkpoint) && value.checkpoint.id === lease.id;
}

function isReadyOwnedCheckpointMeta(value: unknown, lease: RealtimeCheckpointLease): value is RealtimeRoomMeta {
  return isOwnedCheckpointMeta(value, lease) && value.status === "ready";
}

function createCheckpointTransactionSummary(
  value: unknown,
  lease: RealtimeCheckpointLease,
  postgresSceneRevision: number | null
): CheckpointTransactionSummary {
  if (!isRecord(value)) {
    return {
      expectedLeaseId: lease.id,
      currentLeaseId: null,
      currentCheckpointStatus: null,
      roomStatus: null,
      initializedFromRevision: null,
      lastCheckpointRevision: null,
      postgresSceneRevision,
    };
  }

  const checkpoint = isRecord(value.checkpoint) ? value.checkpoint : null;

  return {
    expectedLeaseId: lease.id,
    currentLeaseId: typeof checkpoint?.id === "string" ? checkpoint.id : null,
    currentCheckpointStatus: typeof checkpoint?.status === "string" ? checkpoint.status : null,
    roomStatus: typeof value.status === "string" ? value.status : null,
    initializedFromRevision:
      typeof value.initializedFromRevision === "number" ? value.initializedFromRevision : null,
    lastCheckpointRevision:
      typeof value.lastCheckpointRevision === "number" ? value.lastCheckpointRevision : null,
    postgresSceneRevision,
  };
}

function logCheckpointTransactionDiagnostic(
  phase: string,
  diagnostic: {
    expectedLeaseId: string;
    transactionCommitted: boolean;
    before: CheckpointTransactionSummary | null;
    after: CheckpointTransactionSummary | null;
  }
): void {
  console.warn("Checkpoint RTDB transaction did not finalize as expected", {
    phase,
    checkpointLeaseId: diagnostic.expectedLeaseId,
    currentCheckpointLeaseId: diagnostic.after?.currentLeaseId ?? diagnostic.before?.currentLeaseId ?? null,
    currentCheckpointStatus:
      diagnostic.after?.currentCheckpointStatus ?? diagnostic.before?.currentCheckpointStatus ?? null,
    roomStatus: diagnostic.after?.roomStatus ?? diagnostic.before?.roomStatus ?? null,
    initializedFromRevision:
      diagnostic.after?.initializedFromRevision ?? diagnostic.before?.initializedFromRevision ?? null,
    lastCheckpointRevision:
      diagnostic.after?.lastCheckpointRevision ?? diagnostic.before?.lastCheckpointRevision ?? null,
    postgresSceneRevision:
      diagnostic.after?.postgresSceneRevision ?? diagnostic.before?.postgresSceneRevision ?? null,
    transactionCommitted: diagnostic.transactionCommitted,
  });
}

function isCheckpointFinalized(value: unknown, sceneRevision: number): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.lastCheckpointRevision === sceneRevision &&
    typeof value.lastCheckpointAt === "number" &&
    !isRecord(value.checkpoint)
  );
}

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
      initializedFromRevision: claimedMeta.initializedFromRevision,
      lastCheckpointRevision: claimedMeta.lastCheckpointRevision ?? claimedMeta.initializedFromRevision,
      initializationId,
      checkpoint: null,
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

function normalizeElementsMap(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }

  const elements: Record<string, unknown> = {};

  for (const [elementId, element] of Object.entries(value)) {
    if (!isRecord(element) || element.id !== elementId) {
      continue;
    }

    elements[elementId] = element;
  }

  return elements;
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
