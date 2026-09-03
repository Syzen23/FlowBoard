import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createClearCheckpointLeaseMetaTransactionUpdate,
  createFinalizeCheckpointMetaTransactionUpdate,
} from "./realtime.repository.js";
import type { RealtimeCheckpointLease, RealtimeRoomMeta } from "./realtime.types.js";

const lease: RealtimeCheckpointLease = {
  id: "checkpoint-request-1",
  status: "running",
  startedAt: 1_000,
};

describe("checkpoint RTDB meta transactions", () => {
  it("does not abort finalization when Firebase invokes the transaction first with null", () => {
    const finalize = createFinalizeCheckpointMetaTransactionUpdate(lease, 1, 2_000);

    assert.equal(finalize(null), null);

    const updated = finalize(createReadyMeta(lease));

    assert.deepEqual(updated, {
      status: "ready",
      initializedFromRevision: 0,
      lastCheckpointRevision: 1,
      lastCheckpointAt: 2_000,
    });
  });

  it("does not finalize another checkpoint lease", () => {
    const finalize = createFinalizeCheckpointMetaTransactionUpdate(lease, 1, 2_000);
    const otherLease: RealtimeCheckpointLease = {
      id: "checkpoint-request-2",
      status: "running",
      startedAt: 1_500,
    };

    assert.equal(finalize(createReadyMeta(otherLease)), undefined);
  });

  it("clears only the request-owned checkpoint lease and tolerates initial null", () => {
    const clear = createClearCheckpointLeaseMetaTransactionUpdate(lease);

    assert.equal(clear(null), null);
    assert.deepEqual(clear(createReadyMeta(lease)), {
      status: "ready",
      initializedFromRevision: 0,
    });

    const otherLease: RealtimeCheckpointLease = {
      id: "checkpoint-request-2",
      status: "running",
      startedAt: 1_500,
    };
    assert.equal(clear(createReadyMeta(otherLease)), undefined);
  });
});

function createReadyMeta(checkpoint: RealtimeCheckpointLease): RealtimeRoomMeta {
  return {
    status: "ready",
    initializedFromRevision: 0,
    checkpoint,
  };
}
