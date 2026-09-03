export type RealtimeCanvasPermission = "view" | "edit";

export type RealtimeAccessSource = "owner" | "share";

export type RealtimeAccessRecord = {
  permission: RealtimeCanvasPermission;
  source: RealtimeAccessSource;
  shareId?: string | null;
  grantedAt: number;
};

export type RealtimeRoomStatus = "initializing" | "ready";

export type RealtimeRoomMeta = {
  status: RealtimeRoomStatus;
  initializationStartedAt?: number;
  initializedAt?: number;
  initializedFromRevision: number;
  initializationId?: string;
  lastCheckpointRevision?: number;
  lastCheckpointAt?: number;
  checkpoint?: RealtimeCheckpointLease | null;
};

export type JoinRealtimeRoomResult = {
  canvasId: string;
  permission: RealtimeCanvasPermission;
  roomStatus: "ready";
};

export type RealtimeCheckpointLease = {
  id: string;
  status: "running";
  startedAt: number;
};

export type RealtimeRoomData = {
  meta: RealtimeRoomMeta;
  elements: Record<string, unknown>;
};
