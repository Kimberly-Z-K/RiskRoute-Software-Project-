import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(undefined);
const VERIFIED_KEY = "isVerified";

// AsyncStorage works on Android, iOS and web. Do NOT use localStorage here:
// it only exists in browsers and throws "Property 'localStorage' doesn't exist"
// in the phone app, which made the app forget the 2FA step on every launch.
async function readVerified() {
  try {
    return (await AsyncStorage.getItem(VERIFIED_KEY)) === "true";
  } catch (e) {
    console.warn("Could not read verification flag:", e?.message);
    return false;
  }
}

async function writeVerified(value) {
  try {
    if (value) await AsyncStorage.setItem(VERIFIED_KEY, "true");
    else await AsyncStorage.removeItem(VERIFIED_KEY);
  } catch (e) {
    console.warn("Could not save verification flag:", e?.message);
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const verified = await readVerified();

      setSession(session ?? null);
      // only trust the saved flag if there is still a logged-in session
      setIsVerified(!!session && verified);
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      setSession(nextSession ?? null);

      if (event === "SIGNED_OUT") {
        setIsVerified(false);
        await writeVerified(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateVerified = async (value) => {
    setIsVerified(value);
    await writeVerified(value);
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
    setIsVerified(false);
    await writeVerified(false);
  };

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
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
