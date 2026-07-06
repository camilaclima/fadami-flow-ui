import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  product_id: string | null;
  role_id: string | null;
  group_id: string | null;
  active: boolean;
  first_access: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  permissions: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData as Profile);

      // Fetch permissions from all associated groups (many-to-many)
      const { data: pGroups } = await supabase
        .from("profile_groups")
        .select("group_id")
        .eq("profile_id", profileData.id);

      if (pGroups && pGroups.length > 0) {
        const groupIds = pGroups.map((pg: any) => pg.group_id);
        const { data: groups } = await supabase
          .from("access_groups")
          .select("permissions")
          .in("id", groupIds);

        const allPerms = (groups ?? []).flatMap((g: any) => (g.permissions as string[]) ?? []);
        setPermissions([...new Set(allPerms)]);
      } else if (profileData.group_id) {
        // Fallback to legacy single group_id
        const { data: group } = await supabase
          .from("access_groups")
          .select("permissions")
          .eq("id", profileData.group_id)
          .maybeSingle();
        setPermissions((group?.permissions as string[]) ?? []);
      } else {
        setPermissions([]);
      }
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Use setTimeout to avoid potential deadlocks with Supabase client
          setTimeout(() => fetchProfile(newSession.user.id), 0);
        } else {
          setProfile(null);
          setPermissions([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes("Invalid login")) {
        return { error: "Credenciais inválidas." };
      }
      return { error: error.message };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setPermissions([]);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, permissions, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
