import { ApiError, apiClient } from "@/src/lib/apiClient";
import type { FlowBoardSceneData } from "@/src/features/canvas/types";

export type BackendSharePermission = "view" | "edit";

export interface CanvasShare {
  id: string;
  canvasId: string;
  token: string;
  permission: BackendSharePermission;
  createdAt: string;
  updatedAt: string;
}

export interface PublicSharedCanvas {
  id: string;
  title: string;
  sceneData?: FlowBoardSceneData;
  updatedAt: string;
}

export interface PublicShare {
  canvas: PublicSharedCanvas;
  permission: BackendSharePermission;
}

export const shareRepository = {
  async getByCanvasId(canvasId: string): Promise<CanvasShare | null> {
    try {
      return await apiClient.get<CanvasShare>(`/canvases/${canvasId}/share`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }

      throw error;
    }
  },

  save(canvasId: string, permission: BackendSharePermission): Promise<CanvasShare> {
    return apiClient.put<CanvasShare, { permission: BackendSharePermission }>(
      `/canvases/${canvasId}/share`,
      { permission }
    );
  },

  revoke(canvasId: string): Promise<void> {
    return apiClient.delete(`/canvases/${canvasId}/share`);
  },

  getPublicShare(token: string): Promise<PublicShare> {
    return apiClient.get<PublicShare>(`/shares/${token}`, {
      authenticated: false,
    });
  },

  buildPublicUrl(token: string): string {
    if (typeof window === "undefined") {
      return `https://flowboard.app/app/share/${token}`;
    }

    return `${window.location.origin}/app/share/${token}`;
  },
};
