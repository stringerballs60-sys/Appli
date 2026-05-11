import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { TeamMember, Membership } from '@/types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const rolesService = {
  async getMembership(userId: string): Promise<Membership | null> {
    const { data } = await supabase
      .from('team_members')
      .select('owner_id, role')
      .eq('member_id', userId)
      .maybeSingle();
    if (!data) return null;
    return { ownerId: data.owner_id, role: data.role as 'cleaner' };
  },

  async getTeamMembers(ownerId: string): Promise<TeamMember[]> {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at');
    if (error) throw error;
    return data ?? [];
  },

  async inviteMember(params: {
    email: string;
    password: string;
    fullName: string;
    ownerId: string;
  }): Promise<void> {
    // Temporary client that won't displace the manager's session
    const tempClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: signUpError } = await tempClient.auth.signUp({
      email: params.email,
      password: params.password,
      options: { data: { full_name: params.fullName } },
    });

    if (signUpError) throw signUpError;
    if (!authData.user) throw new Error('Impossible de créer le compte');

    const { error: teamError } = await supabase.from('team_members').insert({
      owner_id: params.ownerId,
      member_id: authData.user.id,
      member_name: params.fullName,
      member_email: params.email,
      role: 'cleaner',
    });

    if (teamError) throw teamError;
  },

  async removeMember(memberId: string, ownerId: string): Promise<void> {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('member_id', memberId)
      .eq('owner_id', ownerId);
    if (error) throw error;
  },
};
