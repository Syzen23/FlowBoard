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
};
