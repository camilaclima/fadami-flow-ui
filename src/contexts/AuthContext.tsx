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
  groupNames: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

type ProfilePayload = {
  profile: Profile | null;
  permissions: string[];
  groupNames: string[];
};

const profileCache = new Map<string, { value: ProfilePayload; expiresAt: number }>();
const profileRequests = new Map<string, Promise<ProfilePayload>>();
const PROFILE_CACHE_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [groupNames, setGroupNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const cached = profileCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      setProfile(cached.value.profile);
      setPermissions(cached.value.permissions);
      setGroupNames(cached.value.groupNames);
      return cached.value;
    }

    let request = profileRequests.get(userId);
    if (!request) {
      request = (async (): Promise<ProfilePayload> => {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id,user_id,first_name,last_name,email,product_id,role_id,group_id,active,first_access")
          .eq("user_id", userId)
          .maybeSingle();
        if (profileError || !profileData) return { profile: null, permissions: [], groupNames: [] };

        const groupIds = new Set<string>();
        const { data: pGroups } = await supabase
          .from("profile_groups")
          .select("group_id")
          .eq("profile_id", profileData.id);
        (pGroups ?? []).forEach((pg: any) => pg.group_id && groupIds.add(pg.group_id));
        if (profileData.group_id) groupIds.add(profileData.group_id);

        let permissionsPayload: string[] = [];
        let namesPayload: string[] = [];
        if (groupIds.size > 0) {
          const { data: groups } = await supabase
            .from("access_groups")
            .select("name,permissions")
            .in("id", Array.from(groupIds));
          permissionsPayload = [
            ...new Set((groups ?? []).flatMap((g: any) => (g.permissions as string[]) ?? [])),
          ];
          namesPayload = (groups ?? [])
            .map((g: any) => String(g.name ?? "").toLowerCase())
            .filter(Boolean);
        }

        return {
          profile: profileData as Profile,
          permissions: permissionsPayload,
          groupNames: namesPayload,
        };
      })().finally(() => profileRequests.delete(userId));
      profileRequests.set(userId, request);
    }

    const payload = await request;
    profileCache.set(userId, { value: payload, expiresAt: Date.now() + PROFILE_CACHE_MS });
    setProfile(payload.profile);
    setPermissions(payload.permissions);
    setGroupNames(payload.groupNames);
    return payload;
  };

  const refreshProfile = async () => {
    if (user) {
      profileCache.delete(user.id);
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === "INITIAL_SESSION") return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === "TOKEN_REFRESHED") {
          setLoading(false);
          return;
        }

        if (newSession?.user) {
          setLoading(true);
          setTimeout(async () => {
            await fetchProfile(newSession.user.id);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setPermissions([]);
          setGroupNames([]);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession()
      .then(async ({ data: { session: currentSession } }) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        } else {
          setProfile(null);
          setPermissions([]);
          setGroupNames([]);
        }
      })
      .catch((err) => {
        console.error("getSession failed:", err);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = error.message || "Erro ao entrar.";
        if (msg.includes("Invalid login")) {
          return { error: "Credenciais inválidas." };
        }
        if (msg.toLowerCase().includes("failed to fetch")) {
          return { error: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente." };
        }
        return { error: msg };
      }
      return { error: null };
    } catch (err: any) {
      console.error("signIn error:", err);
      const msg = typeof err?.message === "string" ? err.message : "";
      if (msg.toLowerCase().includes("failed to fetch")) {
        return { error: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente." };
      }
      return { error: msg || "Erro inesperado ao entrar." };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setPermissions([]);
    setGroupNames([]);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, permissions, groupNames, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
