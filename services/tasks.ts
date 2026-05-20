import { supabase } from './supabase';
import {
  Task,
  TaskFormData,
  TaskStatus,
  TaskType,
  TaskChecklistItem,
  PropertyChecklistTemplate,
} from '@/types';

export interface TaskFilters {
  propertyId?: string;
  tab?: 'today' | 'upcoming' | 'done';
}

export const tasksService = {
  async getAll(userId: string, filters?: TaskFilters): Promise<Task[]> {
    const today = new Date().toISOString().slice(0, 10);

    let query = supabase
      .from('tasks')
      .select('*, property:properties(id, name, color)')
      .eq('user_id', userId)
      .order('scheduled_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (filters?.propertyId) query = query.eq('property_id', filters.propertyId);

    if (filters?.tab === 'today') {
      query = query.eq('scheduled_date', today);
    } else if (filters?.tab === 'upcoming') {
      query = query.gt('scheduled_date', today).neq('status', TaskStatus.DONE);
    } else if (filters?.tab === 'done') {
      query = query.eq('status', TaskStatus.DONE).order('completed_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<Task> {
    const [taskRes, itemsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, property:properties(id, name, color)')
        .eq('id', id)
        .single(),
      supabase
        .from('task_checklist_items')
        .select('*')
        .eq('task_id', id)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true }),
    ]);
    if (taskRes.error) throw taskRes.error;
    if (itemsRes.error) throw itemsRes.error;

    let assigned_agent = undefined;
    if (taskRes.data.assigned_to) {
      const { data: agentData } = await supabase
        .from('team_members')
        .select('member_id, member_name')
        .eq('member_id', taskRes.data.assigned_to)
        .maybeSingle();
      if (agentData) assigned_agent = agentData;
    }

    return { ...taskRes.data, checklist_items: itemsRes.data, assigned_agent };
  },

  async create(userId: string, form: TaskFormData): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        property_id: form.property_id,
        reservation_id: form.reservation_id,
        type: form.type,
        title: form.title,
        scheduled_date: form.scheduled_date,
        notes: form.notes || null,
        status: TaskStatus.PENDING,
      })
      .select('*, property:properties(id, name, color)')
      .single();
    if (error) throw error;
    return { ...data, checklist_items: [] };
  },

  async update(id: string, fields: Partial<TaskFormData>): Promise<void> {
    const { error } = await supabase.from('tasks').update(fields).eq('id', id);
    if (error) throw error;
  },

  async start(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ status: TaskStatus.IN_PROGRESS, started_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async finish(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ status: TaskStatus.DONE, completed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async pause(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ status: TaskStatus.PAUSED, paused_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  },

  async resume(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ status: TaskStatus.IN_PROGRESS, paused_at: null })
      .eq('id', id);
    if (error) throw error;
  },

  async assign(id: string, agentId: string | null): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .update({ assigned_to: agentId })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Checklist items ────────────────────────────────────────────────────────────────

  async addChecklistItem(
    taskId: string,
    userId: string,
    label: string,
    orderIndex: number
  ): Promise<TaskChecklistItem> {
    const { data, error } = await supabase
      .from('task_checklist_items')
      .insert({ task_id: taskId, user_id: userId, label, order_index: orderIndex })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async toggleChecklistItem(itemId: string, isChecked: boolean): Promise<void> {
    const { error } = await supabase
      .from('task_checklist_items')
      .update({
        is_checked: isChecked,
        checked_at: isChecked ? new Date().toISOString() : null,
      })
      .eq('id', itemId);
    if (error) throw error;
  },

  async deleteChecklistItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('task_checklist_items')
      .delete()
      .eq('id', itemId);
    if (error) throw error;
  },

  // ── Templates ─────────────────────────────────────────────────────────────────────────

  async getTemplates(
    userId: string,
    propertyId: string
  ): Promise<PropertyChecklistTemplate[]> {
    const { data, error } = await supabase
      .from('property_checklist_templates')
      .select('*')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async addTemplate(
    userId: string,
    propertyId: string,
    label: string,
    orderIndex: number
  ): Promise<PropertyChecklistTemplate> {
    const { data, error } = await supabase
      .from('property_checklist_templates')
      .insert({ user_id: userId, property_id: propertyId, label, order_index: orderIndex })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('property_checklist_templates')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async applyTemplate(taskId: string, userId: string, propertyId: string): Promise<void> {
    const templates = await tasksService.getTemplates(userId, propertyId);
    if (templates.length === 0) return;
    const items = templates.map((t) => ({
      task_id: taskId,
      user_id: userId,
      label: t.label,
      order_index: t.order_index,
    }));
    const { error } = await supabase.from('task_checklist_items').insert(items);
    if (error) throw error;
  },

  async countForToday(userId: string): Promise<{ pending: number; done: number }> {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('tasks')
      .select('status')
      .eq('user_id', userId)
      .eq('scheduled_date', today);
    if (error) throw error;
    const pending = (data ?? []).filter((t) => t.status !== TaskStatus.DONE).length;
    const done = (data ?? []).filter((t) => t.status === TaskStatus.DONE).length;
    return { pending, done };
  },
};
