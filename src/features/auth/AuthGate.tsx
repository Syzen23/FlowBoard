import { LoginScreen } from "@/src/features/auth/LoginScreen";
import { useAuth } from "@/src/features/auth/AuthContext";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141416] text-zinc-400 flex items-center justify-center text-sm">
        Loading...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
