import type { FlowBoardCanvasElement } from "@/src/features/canvas/types";

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
};

export type JoinRealtimeRoomResult = {
  canvasId: string;
  permission: RealtimeCanvasPermission;
  roomStatus: "ready";
};

export type RealtimeRoomSnapshot = {
  meta: RealtimeRoomMeta | null;
  elements: Record<string, unknown>;
  files: Record<string, unknown>;
};

export type RealtimeCanvasElement = FlowBoardCanvasElement;

export type RealtimeElementSubscriptionHandlers = {
  onAdded: (element: RealtimeCanvasElement) => void;
  onChanged: (element: RealtimeCanvasElement) => void;
  onRemoved?: (elementId: string) => void;
  onError?: (error: Error) => void;
};

export type RealtimeUnsubscribe = () => void;

export type CheckpointRealtimeRoomResult = {
  canvasId: string;
  sceneRevision: number;
  checkpointedAt: string;
};
