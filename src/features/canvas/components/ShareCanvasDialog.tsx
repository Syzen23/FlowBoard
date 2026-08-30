import * as React from "react";
import { Share2, Copy, Check, Globe, Lock, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { SharePermission } from "@/src/types";
import {
  getCanvasShareSetting,
  saveCanvasShareSetting,
  buildShareUrl,
} from "@/src/features/canvas/utils/shareStorage";

interface ShareCanvasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasId?: string;
  canvasTitle?: string;
}

export function ShareCanvasDialog({
  open,
  onOpenChange,
  canvasId = "",
  canvasTitle = "Untitled Canvas",
}: ShareCanvasDialogProps) {
  const [accessMode, setAccessMode] = React.useState<"private" | "anyone">("private");
  const [publicPermission, setPublicPermission] = React.useState<"view" | "edit">("view");
  const [copied, setCopied] = React.useState(false);

  // Load existing share settings on open or canvasId change
  React.useEffect(() => {
    if (open && canvasId) {
      const setting = getCanvasShareSetting(canvasId);
      if (setting.permission === "private") {
        setAccessMode("private");
        setPublicPermission("view");
      } else {
        setAccessMode("anyone");
        setPublicPermission(setting.permission);
      }
      setCopied(false);
    }
  }, [open, canvasId]);

  const handleSelectPrivate = () => {
    setAccessMode("private");
    if (canvasId) {
      saveCanvasShareSetting(canvasId, "private");
    }
  };

  const handleSelectAnyone = (permissionToSet: "view" | "edit" = publicPermission) => {
    setAccessMode("anyone");
    setPublicPermission(permissionToSet);
    if (canvasId) {
      saveCanvasShareSetting(canvasId, permissionToSet);
    }
  };

  const handlePermissionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as "view" | "edit";
    setPublicPermission(val);
    if (canvasId && accessMode === "anyone") {
      saveCanvasShareSetting(canvasId, val);
    }
  };

  const shareLink = React.useMemo(() => {
    if (!canvasId) return "";
    return buildShareUrl(canvasId, publicPermission);
  }, [canvasId, publicPermission]);

  const handleCopy = () => {
    if (accessMode === "private" || !shareLink) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareLink);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md bg-[#1b1b1e] border-zinc-800 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Share2 className="w-4 h-4" />
            </span>
            <DialogTitle className="text-base text-zinc-100 font-semibold">
              Share Canvas
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400 mt-1">
            Manage public access and collaborator permissions for &ldquo;{canvasTitle}&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-3 text-left">
          {/* General Access Header */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              General Access
            </label>

            <div className="space-y-2">
              {/* Private Option */}
              <label
                onClick={handleSelectPrivate}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  accessMode === "private"
                    ? "bg-[#232328] border-blue-500/60 shadow-xs"
                    : "bg-[#1f1f22] border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <input
                  type="radio"
                  name="general-access"
                  checked={accessMode === "private"}
                  onChange={handleSelectPrivate}
                  className="mt-0.5 text-blue-500 focus:ring-0 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
                    <Lock className="w-3.5 h-3.5 text-zinc-400" />
                    Private
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Only you can access this canvas. Public link sharing is disabled.
                  </p>
                </div>
              </label>

              {/* Anyone with link Option */}
              <label
                onClick={() => handleSelectAnyone(publicPermission)}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  accessMode === "anyone"
                    ? "bg-[#232328] border-blue-500/60 shadow-xs"
                    : "bg-[#1f1f22] border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <input
                  type="radio"
                  name="general-access"
                  checked={accessMode === "anyone"}
                  onChange={() => handleSelectAnyone(publicPermission)}
                  className="mt-0.5 text-blue-500 focus:ring-0 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-200">
                      <Globe className="w-3.5 h-3.5 text-blue-400" />
                      Anyone with link
                    </span>

                    {accessMode === "anyone" && (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={publicPermission}
                          onChange={handlePermissionChange}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-[#2a2a30] text-xs text-blue-300 font-medium rounded-md px-2.5 py-1 border border-zinc-700/80 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
                        >
                          <option value="view">Can View</option>
                          <option value="edit">Can Edit</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Anyone on the internet with the link can access this canvas.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Link Box */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Simulated Share Link
            </label>

            {accessMode === "anyone" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[#242428] border border-zinc-700/60">
                  <input
                    type="text"
                    readOnly
                    value={shareLink}
                    className="w-full bg-transparent text-xs text-zinc-200 font-mono focus:outline-none truncate select-all"
                  />
                  <Button
                    type="button"
                    variant="blue"
                    size="sm"
                    onClick={handleCopy}
                    className="shrink-0 text-xs h-7 px-3 gap-1.5 font-medium cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span className="text-emerald-300">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                  <span>
                    Permission: <strong className="text-zinc-200">{publicPermission === "view" ? "View only" : "Can Edit"}</strong>
                  </span>
                  <a
                    href={shareLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>Open in new tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#242428]/50 border border-zinc-800 text-zinc-500 text-xs">
                <span className="truncate italic">
                  Public link is disabled when access is set to Private.
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled
                  className="shrink-0 text-xs h-7 px-3 opacity-40 cursor-not-allowed bg-zinc-800 text-zinc-500 border-zinc-700"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800/80">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-zinc-300 hover:text-zinc-100"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
