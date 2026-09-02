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
import {
  type BackendSharePermission,
  type CanvasShare,
  shareRepository,
} from "@/src/features/canvas/repositories/shareRepository";

interface ShareCanvasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvasId?: string;
  canvasTitle?: string;
}

type AccessMode = "private" | "anyone";

export function ShareCanvasDialog({
  open,
  onOpenChange,
  canvasId = "",
  canvasTitle = "Untitled Canvas",
}: ShareCanvasDialogProps) {
  const [accessMode, setAccessMode] = React.useState<AccessMode>("private");
  const [publicPermission, setPublicPermission] = React.useState<BackendSharePermission>("view");
  const [activeShare, setActiveShare] = React.useState<CanvasShare | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open || !canvasId) return;

    let isCurrentRequest = true;
    setIsLoading(true);
    setError(null);
    setCopied(false);

    shareRepository
      .getByCanvasId(canvasId)
      .then((share) => {
        if (!isCurrentRequest) return;

        setActiveShare(share);
        setAccessMode(share ? "anyone" : "private");
        setPublicPermission(share?.permission || "view");
      })
      .catch((loadError) => {
        if (!isCurrentRequest) return;

        setActiveShare(null);
        setAccessMode("private");
        setPublicPermission("view");
        setError(getShareErrorMessage(loadError));
      })
      .finally(() => {
        if (isCurrentRequest) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [open, canvasId]);

  const shareLink = React.useMemo(() => {
    return activeShare ? shareRepository.buildPublicUrl(activeShare.token) : "";
  }, [activeShare]);

  const saveShare = async (permission: BackendSharePermission) => {
    if (!canvasId || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setCopied(false);

    try {
      const savedShare = await shareRepository.save(canvasId, permission);
      setActiveShare(savedShare);
      setAccessMode("anyone");
      setPublicPermission(savedShare.permission);
    } catch (saveError) {
      setError(getShareErrorMessage(saveError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectPrivate = async () => {
    if (!canvasId || isSubmitting) return;

    if (!activeShare) {
      setAccessMode("private");
      setPublicPermission("view");
      setCopied(false);
      setError(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setCopied(false);

    try {
      await shareRepository.revoke(canvasId);
      setActiveShare(null);
      setAccessMode("private");
      setPublicPermission("view");
    } catch (revokeError) {
      setError(getShareErrorMessage(revokeError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAnyone = () => {
    void saveShare(activeShare?.permission || publicPermission);
  };

  const handlePermissionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const permission = e.target.value as BackendSharePermission;
    setPublicPermission(permission);

    if (accessMode === "anyone") {
      void saveShare(permission);
    }
  };

  const handleCopy = async () => {
    if (accessMode === "private" || !shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Unable to copy share link.");
    }
  };

  const controlsDisabled = isLoading || isSubmitting || !canvasId;

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
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              General Access
            </label>

            {(isLoading || isSubmitting || error) && (
              <div
                className={`mb-2 rounded-lg border px-3 py-2 text-[11px] ${
                  error
                    ? "border-red-500/20 bg-red-500/10 text-red-300"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400"
                }`}
              >
                {error || (isLoading ? "Loading share settings..." : "Updating share settings...")}
              </div>
            )}

            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  controlsDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                } ${
                  accessMode === "private"
                    ? "bg-[#232328] border-blue-500/60 shadow-xs"
                    : "bg-[#1f1f22] border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <input
                  type="radio"
                  name="general-access"
                  checked={accessMode === "private"}
                  disabled={controlsDisabled}
                  onChange={() => void handleSelectPrivate()}
                  className="mt-0.5 text-blue-500 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
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

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                  controlsDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                } ${
                  accessMode === "anyone"
                    ? "bg-[#232328] border-blue-500/60 shadow-xs"
                    : "bg-[#1f1f22] border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <input
                  type="radio"
                  name="general-access"
                  checked={accessMode === "anyone"}
                  disabled={controlsDisabled}
                  onChange={handleSelectAnyone}
                  className="mt-0.5 text-blue-500 focus:ring-0 cursor-pointer disabled:cursor-not-allowed"
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
                          disabled={controlsDisabled}
                          onChange={handlePermissionChange}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-[#2a2a30] text-xs text-blue-300 font-medium rounded-md px-2.5 py-1 border border-zinc-700/80 focus:outline-none focus:border-blue-500 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
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

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Share Link
            </label>

            {accessMode === "anyone" && activeShare ? (
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
                    onClick={() => void handleCopy()}
                    disabled={controlsDisabled}
                    className="shrink-0 text-xs h-7 px-3 gap-1.5 font-medium cursor-pointer disabled:cursor-not-allowed"
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

function getShareErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to update share settings.";
}
