import * as React from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  getFirebaseAuth,
  googleAuthProvider,
  isFirebaseConfigured,
} from "@/src/features/auth/firebaseClient";

type AuthContextValue = {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(isFirebaseConfigured);

  React.useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    const auth = getFirebaseAuth();
    await signInWithPopup(auth, googleAuthProvider);
  }, []);

  const signOut = React.useCallback(async () => {
    if (!isFirebaseConfigured) return;
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      currentUser,
      loading,
      signInWithGoogle,
      signOut,
      isConfigured: isFirebaseConfigured,
    }),
    [currentUser, loading, signInWithGoogle, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
