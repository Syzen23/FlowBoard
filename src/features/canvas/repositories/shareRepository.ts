import { CanvasShareSetting, SharePermission } from "@/src/types";
import {
  SHARE_SETTINGS_UPDATED_EVENT,
  buildShareUrl,
  getCanvasShareSetting,
  loadAllShareSettings,
  saveCanvasShareSetting,
} from "@/src/features/canvas/utils/shareStorage";

export { SHARE_SETTINGS_UPDATED_EVENT };

export const shareRepository = {
  getAll(): Record<string, CanvasShareSetting> {
    return loadAllShareSettings();
  },

  getByCanvasId(canvasId: string): CanvasShareSetting {
    return getCanvasShareSetting(canvasId);
  },

  save(canvasId: string, permission: SharePermission): CanvasShareSetting {
    return saveCanvasShareSetting(canvasId, permission);
  },

  buildUrl(canvasId: string, permission: "view" | "edit"): string {
    return buildShareUrl(canvasId, permission);
  },
};
