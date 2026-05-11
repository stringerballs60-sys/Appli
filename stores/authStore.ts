import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { Profile, Membership } from '@/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  membership: Membership | null;
  effectiveUserId: string | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setMembership: (membership: Membership | null) => void;
  setEffectiveUserId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  membership: null,
  effectiveUserId: null,
  isLoading: true,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  setMembership: (membership) => set({ membership }),
  setEffectiveUserId: (effectiveUserId) => set({ effectiveUserId }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ session: null, user: null, profile: null, membership: null, effectiveUserId: null }),
}));
