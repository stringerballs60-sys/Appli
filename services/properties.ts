import { supabase } from './supabase';
import { Property, PropertyFormData } from '@/types';

export const propertiesService = {
  async getAll(userId: string): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    if (error) throw error;
    return data;
  },

  async getActive(userId: string): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(userId: string, form: PropertyFormData): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .insert({ ...form, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<PropertyFormData>): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('properties')
      .update({ is_active: isActive })
      .eq('id', id);
    if (error) throw error;
  },
};
