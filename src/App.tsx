import * as React from "react";
import RootLayout from "@/src/app/layout";
import CanvasPage from "@/src/app/app/canvas/page";
import CalendarPage from "@/src/app/app/calendar/page";
import SharePage from "@/src/app/app/share/page";
import { RouteMode } from "@/src/types";

function parseRouteFromUrl(): {
  mode: RouteMode;
  shareCanvasId?: string;
  sharePermission?: "view" | "edit";
} {
  if (typeof window === "undefined") {
    return { mode: "canvas" };
  }

  const pathname = window.location.pathname;
  const search = window.location.search;
  const params = new URLSearchParams(search);

  if (pathname.includes("/app/share") || pathname.includes("/share")) {
    // Extract canvas ID from path: /app/share/:canvasId or query: ?canvasId=...
    const parts = pathname.split("/").filter(Boolean);
    const shareIndex = parts.findIndex((p) => p === "share");
    let canvasId = "";
    if (shareIndex !== -1 && parts[shareIndex + 1]) {
      canvasId = parts[shareIndex + 1];
    } else {
      canvasId = params.get("canvasId") || "";
    }

    const permParam = params.get("permission");
    const sharePermission: "view" | "edit" | undefined =
      permParam === "edit" ? "edit" : permParam === "view" ? "view" : undefined;

    return {
      mode: "share",
      shareCanvasId: canvasId,
      sharePermission,
    };
  }

  if (pathname.includes("calendar")) {
    return { mode: "calendar" };
  }

  return { mode: "canvas" };
}

export function App() {
  const [routeInfo, setRouteInfo] = React.useState(() => parseRouteFromUrl());

  const [activeCanvasId, setActiveCanvasId] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("flowboard_current_canvas") || "";
    }
    return "";
  });

  // Handle browser back/forward buttons
  React.useEffect(() => {
    const handlePopState = () => {
      setRouteInfo(parseRouteFromUrl());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigate = (newMode: RouteMode) => {
    if (typeof window !== "undefined") {
      const targetUrl =
        newMode === "calendar"
          ? "/app/calendar"
          : newMode === "share"
          ? `/app/share/${activeCanvasId}?permission=view`
          : "/app/canvas";

      if (window.location.pathname !== targetUrl) {
        window.history.pushState(null, "", targetUrl);
      }
    }
    setRouteInfo(parseRouteFromUrl());
  };

  const handleOpenCanvasFromCalendar = (canvasId: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("flowboard_current_canvas", canvasId);
    }
    setActiveCanvasId(canvasId);
    handleNavigate("canvas");
  };

  return (
    <RootLayout>
      {routeInfo.mode === "share" ? (
        <SharePage
          canvasId={routeInfo.shareCanvasId || ""}
          permission={routeInfo.sharePermission}
          onReturnToApp={() => handleNavigate("canvas")}
        />
      ) : routeInfo.mode === "calendar" ? (
        <CalendarPage
          onNavigate={handleNavigate}
          onOpenCanvas={handleOpenCanvasFromCalendar}
        />
      ) : (
        <CanvasPage
          onNavigate={handleNavigate}
          activeCanvasId={activeCanvasId}
          onSelectCanvas={(id) => setActiveCanvasId(id)}
        />
      )}
    </RootLayout>
  );
}

export default App;
