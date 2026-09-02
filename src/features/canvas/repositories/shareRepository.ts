import { ApiError, apiClient } from "@/src/lib/apiClient";

export type BackendSharePermission = "view" | "edit";

export interface CanvasShare {
  id: string;
  canvasId: string;
  token: string;
  permission: BackendSharePermission;
  createdAt: string;
  updatedAt: string;
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

  buildPublicUrl(token: string): string {
    if (typeof window === "undefined") {
      return `https://flowboard.app/app/share/${token}`;
    }

    return `${window.location.origin}/app/share/${token}`;
  },
};
