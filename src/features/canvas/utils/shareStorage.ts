import { SharePermission, CanvasShareSetting } from "@/src/types";

export const STORAGE_KEY_SHARE_SETTINGS = "flowboard_share_settings";
export const SHARE_SETTINGS_UPDATED_EVENT = "flowboard_share_settings_updated";

export function loadAllShareSettings(): Record<string, CanvasShareSetting> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SHARE_SETTINGS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
    return {};
  } catch (err) {
    console.error("Failed to load share settings from localStorage:", err);
    return {};
  }
}

export function getCanvasShareSetting(canvasId: string): CanvasShareSetting {
  if (!canvasId) {
    return {
      canvasId: "",
      permission: "private",
      updatedAt: new Date().toISOString(),
    };
  }
  const all = loadAllShareSettings();
  if (all[canvasId]) {
    return all[canvasId];
  }
  return {
    canvasId,
    permission: "private",
    updatedAt: new Date().toISOString(),
  };
}

export function saveCanvasShareSetting(
  canvasId: string,
  permission: SharePermission
): CanvasShareSetting {
  const all = loadAllShareSettings();
  const setting: CanvasShareSetting = {
    canvasId,
    permission,
    updatedAt: new Date().toISOString(),
  };
  all[canvasId] = setting;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY_SHARE_SETTINGS, JSON.stringify(all));
      window.dispatchEvent(
        new CustomEvent(SHARE_SETTINGS_UPDATED_EVENT, { detail: setting })
      );
    } catch (err) {
      console.error("Failed to save share setting to localStorage:", err);
    }
  }

  return setting;
}

export function buildShareUrl(canvasId: string, permission: "view" | "edit"): string {
  if (typeof window === "undefined") {
    return `https://flowboard.app/app/share/${canvasId}?permission=${permission}`;
  }
  const origin = window.location.origin;
  return `${origin}/app/share/${canvasId}?permission=${permission}`;
}
