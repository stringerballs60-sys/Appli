import { supabase } from './supabase';
import { CalendarMark, CalendarMarkColor, CalendarMarkKind } from '@/types';

export type CalendarMarkInput = {
  title: string;
  start_date: string;
  end_date: string;
  color: CalendarMarkColor;
  kind?: CalendarMarkKind;
  yearly: boolean;
};

export const calendarMarksService = {
  async getAll(userId: string): Promise<CalendarMark[]> {
    const { data, error } = await supabase
      .from('calendar_marks')
      .select('*')
      .eq('user_id', userId)
      .order('start_date');
    if (error) throw error;
    return data ?? [];
  },

  async create(userId: string, input: CalendarMarkInput): Promise<CalendarMark> {
    const { data, error } = await supabase
      .from('calendar_marks')
      .insert({ ...input, title: input.title.trim(), kind: input.kind ?? 'event', user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: CalendarMarkInput): Promise<void> {
    const { error } = await supabase
      .from('calendar_marks')
      .update({ ...input, title: input.title.trim() })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('calendar_marks').delete().eq('id', id);
    if (error) throw error;
  },
};
