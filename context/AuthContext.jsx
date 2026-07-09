// import React, { createContext, useContext, useEffect, useState } from "react";
// import { supabase } from "../lib/supabase";

// const AuthContext = createContext(undefined);

// export function AuthProvider({ children }) {
//   const [session, setSession] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [isVerified, setIsVerified] = useState(false);

//   useEffect(() => {
//     const init = async () => {
//       const { data: { session } } = await supabase.auth.getSession();
//       setSession(session ?? null);
//       setLoading(false);
//     };

//     init();

//     const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
//       setSession(nextSession ?? null);
//       // console.log("AUTH CHANGE");
//     });

//     return () => subscription.unsubscribe();
//   }, []);

//   return (
//     <AuthContext.Provider
//       value={{
//         user: session?.user ?? null,
//         session,
//         loading,
//         isVerified,
//         setIsVerified,
//         signOut: async () => {
//           await supabase.auth.signOut({ scope: "local" });
//           setIsVerified(false);
//         },
//       }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (!context) throw new Error("useAuth must be used within an AuthProvider");
//   return context;
// }

import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(undefined);
const VERIFIED_KEY = "isVerified";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const storedVerified = await AsyncStorage.getItem(VERIFIED_KEY);

      setSession(session ?? null);
      setIsVerified(storedVerified === "true");
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      setSession(nextSession ?? null);

      if (event === "SIGNED_OUT") {
        setIsVerified(false);
        await AsyncStorage.removeItem(VERIFIED_KEY);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const updateVerified = async (value) => {
    setIsVerified(value);
    await AsyncStorage.setItem(VERIFIED_KEY, String(value));
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
    setIsVerified(false);
    await AsyncStorage.removeItem(VERIFIED_KEY);
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