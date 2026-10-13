
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import { supabase } from "../lib/supabase";

const AuthContext = createContext(undefined);
const VERIFIED_KEY = "isVerified";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerifiedState] = useState(false);

  useEffect(() => {
    let mounted = true;
    let authEventReceived = false;

    // Read the verification flag safely in the browser.
    const readVerifiedFlag = () => {
      try {
        return localStorage.getItem(VERIFIED_KEY) === "true";
      } catch (error) {
        console.warn("Could not read verification flag:", error);
        return false;
      }
    };

    // Register the listener before initializing the session.
    // Keep this callback synchronous.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      authEventReceived = true;

      if (!mounted) return;

      setSession(nextSession ?? null);

      if (event === "SIGNED_OUT") {
        setIsVerifiedState(false);

        try {
          localStorage.removeItem(VERIFIED_KEY);
        } catch (error) {
          console.warn("Could not clear verification flag:", error);
        }
      }

      if (event === "INITIAL_SESSION") {
        setIsVerifiedState(readVerifiedFlag());
        setLoading(false);
      }
    });

    // Load the existing session without overwriting a newer auth event.
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!mounted) return;

        if (!authEventReceived) {
          setSession(initialSession ?? null);
          setIsVerifiedState(readVerifiedFlag());
        }
      } catch (error) {
        console.error("Failed to initialize authentication:", error);

        if (mounted && !authEventReceived) {
          setSession(null);
          setIsVerifiedState(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Update the verification flag.
  const updateVerified = useCallback(async (value) => {
    const verified = Boolean(value);

    setIsVerifiedState(verified);

    try {
      if (verified) {
        localStorage.setItem(VERIFIED_KEY, "true");
      } else {
        localStorage.removeItem(VERIFIED_KEY);
      }
    } catch (error) {
      console.error("Could not save verification flag:", error);
    }
  }, []);

  // Sign out only this device's local session.
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut({
      scope: "local",
    });

    if (error) {
      console.error("Sign-out failed:", error);
      throw error;
    }

    setSession(null);
    setIsVerifiedState(false);

    try {
      localStorage.removeItem(VERIFIED_KEY);
    } catch (error) {
      console.warn("Could not clear verification flag:", error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        isVerified,
        setIsVerified: updateVerified,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
