import type { Session } from "@supabase/supabase-js";
import { mobileApi } from "@/api/client";
import type { AuthUser } from "@/api/types";
import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/state/useAppStore";

export async function syncBackendProfileFromSession(session: Session): Promise<AuthUser> {
  const store = useAppStore.getState();
  store.setAuthToken(session.access_token);
  try {
    const user = await mobileApi.me();
    await store.setAuthSession(session.access_token, user);
    return user;
  } catch (error) {
    await store.clearSession();
    throw error;
  }
}

export async function clearSupabaseAndLocalSession() {
  try {
    await supabase.auth.signOut();
  } catch {
    // Local session cleanup should still finish if the remote session is already gone.
  }
  await useAppStore.getState().clearSession();
}
