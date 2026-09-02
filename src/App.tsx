import * as React from "react";
import { Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import RootLayout from "@/src/app/layout";
import CanvasPage from "@/src/app/app/canvas/page";
import CalendarPage from "@/src/app/app/calendar/page";
import SharePage from "@/src/app/app/share/page";
import { RouteMode } from "@/src/types";
import { useCanvasManager } from "@/src/features/canvas/hooks/useCanvasManager";
import { AuthGate } from "@/src/features/auth/AuthGate";

export function App() {
  const canvasManager = useCanvasManager();
  const navigate = useNavigate();

  const handleNavigate = React.useCallback(
    (newMode: RouteMode) => {
      const targetUrl =
        newMode === "calendar"
          ? "/app/calendar"
          : newMode === "share"
          ? `/app/share/${canvasManager.activeCanvasId}?permission=view`
          : "/app/canvas";

      navigate(targetUrl);
    },
    [canvasManager.activeCanvasId, navigate]
  );

  const handleOpenCanvasFromCalendar = React.useCallback(
    (canvasId: string) => {
      void canvasManager.switchCanvas(canvasId);
      navigate("/app/canvas");
    },
    [canvasManager, navigate]
  );

  return (
    <RootLayout>
      <AuthGate>
        <Routes>
          <Route path="/" element={<Navigate to="/app/canvas" replace />} />
          <Route path="/app" element={<Navigate to="/app/canvas" replace />} />
          <Route
            path="/app/canvas"
            element={
              <CanvasPage
                onNavigate={handleNavigate}
                canvasManager={canvasManager}
              />
            }
          />
          <Route
            path="/app/calendar"
            element={
              <CalendarPage
                onNavigate={handleNavigate}
                onOpenCanvas={handleOpenCanvasFromCalendar}
                canvasManager={canvasManager}
              />
            }
          />
          <Route
            path="/app/share/:canvasId"
            element={<ShareRoute onReturnToApp={() => handleNavigate("canvas")} />}
          />
          <Route path="*" element={<Navigate to="/app/canvas" replace />} />
        </Routes>
      </AuthGate>
    </RootLayout>
  );
}

interface ShareRouteProps {
  onReturnToApp: () => void;
}

function ShareRoute({ onReturnToApp }: ShareRouteProps) {
  const { canvasId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const permissionParam = searchParams.get("permission");
  const permission =
    permissionParam === "edit" ? "edit" : permissionParam === "view" ? "view" : undefined;

  return (
    <SharePage
      canvasId={canvasId}
      permission={permission}
      onReturnToApp={onReturnToApp}
    />
  );
}

export default App;
