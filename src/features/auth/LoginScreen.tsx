import { LogIn } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useAuth } from "@/src/features/auth/AuthContext";

export function LoginScreen() {
  const { isConfigured, signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-[#141416] text-zinc-100 flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-zinc-800 bg-[#1e1e22] p-6 shadow-xl">
        <h1 className="text-xl font-semibold">FlowBoard</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Sign in to continue to your workspace.
        </p>

        {!isConfigured ? (
          <p className="mt-5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            Firebase client environment variables are not configured yet.
          </p>
        ) : null}

        <Button
          type="button"
          variant="blue"
          className="mt-5 w-full gap-2"
          onClick={() => {
            void signInWithGoogle();
          }}
          disabled={!isConfigured}
        >
          <LogIn className="h-4 w-4" />
          <span>Sign in with Google</span>
        </Button>
      </div>
    </div>
  );
}
