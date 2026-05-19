import { supabase } from './supabase';
import { Memo, MemoPriority } from '@/types';

export const memosService = {
  async getPending(userId: string): Promise<Memo[]> {
    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getDone(userId: string, limit = 30): Promise<Memo[]> {
    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'done')
      .order('completed_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async add(userId: string, text: string, priority: MemoPriority = 'normal'): Promise<Memo> {
    const { data, error } = await supabase
      .from('memos')
      .insert({ user_id: userId, text, priority })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markDone(id: string): Promise<void> {
    const { error } = await supabase
      .from('memos')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async markPending(id: string): Promise<void> {
    const { error } = await supabase
      .from('memos')
      .update({ status: 'pending', completed_at: null })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('memos').delete().eq('id', id);
    if (error) throw error;
  },

  async countPending(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('memos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending');
    if (error) throw error;
    return count ?? 0;
  },
};
