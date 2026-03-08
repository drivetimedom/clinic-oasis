import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileEnsured, setProfileEnsured] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);

      // Only upsert profile on sign in, not every event
      if (u && event === "SIGNED_IN" && !profileEnsured) {
        setProfileEnsured(true);
        supabase.from("profiles").upsert({
          id: u.id,
          full_name: u.user_metadata?.full_name || null,
        }, { onConflict: "id", ignoreDuplicates: true }).then(() => {});
      }
      if (!u) {
        setProfileEnsured(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
