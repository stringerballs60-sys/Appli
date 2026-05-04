import { supabase } from './supabase';
import { Reservation, ReservationFormData, Property } from '@/types';
import { calculateLinen } from '@/utils/linenCalculator';

export const reservationsService = {
  async getAll(
    userId: string,
    filters?: { propertyId?: string; from?: string; to?: string; status?: string }
  ): Promise<Reservation[]> {
    let query = supabase
      .from('reservations')
      .select('*, property:properties(*)')
      .eq('user_id', userId)
      .order('check_in', { ascending: true });

    if (filters?.propertyId) query = query.eq('property_id', filters.propertyId);
    if (filters?.from) query = query.gte('check_in', filters.from);
    if (filters?.to) query = query.lte('check_out', filters.to);
    if (filters?.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getForMonth(userId: string, from: string, to: string): Promise<Reservation[]> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*, property:properties(id, name, color)')
      .eq('user_id', userId)
      .lt('check_in', to)
      .gt('check_out', from)
      .neq('status', 'cancelled');
    if (error) throw error;
    return data;
  },

  async getForDay(userId: string, date: string): Promise<Reservation[]> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*, property:properties(*)')
      .eq('user_id', userId)
      .lte('check_in', date)
      .gt('check_out', date)
      .neq('status', 'cancelled');
    if (error) throw error;
    return data;
  },

  async getUpcoming(userId: string, limit = 3): Promise<Reservation[]> {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('reservations')
      .select('*, property:properties(*)')
      .eq('user_id', userId)
      .gte('check_in', today)
      .neq('status', 'cancelled')
      .order('check_in')
      .limit(limit);
    if (error) throw error;
    return data;
  },

  async getTodayActivity(userId: string): Promise<{
    checkIns: Reservation[];
    checkOuts: Reservation[];
  }> {
    const today = new Date().toISOString().slice(0, 10);
    const [checkInsRes, checkOutsRes] = await Promise.all([
      supabase
        .from('reservations')
        .select('*, property:properties(*)')
        .eq('user_id', userId)
        .eq('check_in', today)
        .neq('status', 'cancelled'),
      supabase
        .from('reservations')
        .select('*, property:properties(*)')
        .eq('user_id', userId)
        .eq('check_out', today)
        .neq('status', 'cancelled'),
    ]);
    if (checkInsRes.error) throw checkInsRes.error;
    if (checkOutsRes.error) throw checkOutsRes.error;
    return { checkIns: checkInsRes.data, checkOuts: checkOutsRes.data };
  },

  async getPendingCheckInTime(userId: string, daysAhead = 3): Promise<Reservation[]> {
    const today = new Date().toISOString().slice(0, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('reservations')
      .select('*, property:properties(*)')
      .eq('user_id', userId)
      .gte('check_in', today)
      .lte('check_in', cutoffStr)
      .eq('check_in_time_confirmed', false)
      .neq('status', 'cancelled')
      .order('check_in');
    if (error) throw error;
    return data;
  },

  async checkOverlap(
    propertyId: string,
    checkIn: string,
    checkOut: string,
    excludeId?: string
  ): Promise<boolean> {
    let query = supabase
      .from('reservations')
      .select('id')
      .eq('property_id', propertyId)
      .neq('status', 'cancelled')
      .lt('check_in', checkOut)
      .gt('check_out', checkIn);
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).length > 0;
  },

  async create(
    userId: string,
    form: ReservationFormData,
    property: Property
  ): Promise<Reservation> {
    const linen_calculation = calculateLinen(
      { nb_couples: form.nb_couples, nb_solo_adults: form.nb_solo_adults, nb_children: form.nb_children },
      {
        beds_double_used: form.beds_double_used,
        beds_single_used: form.beds_single_used,
        beds_sofa_used: form.beds_sofa_used,
        beds_crib_used: form.beds_crib_used,
      },
      property.nb_bathrooms
    );

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        ...form,
        user_id: userId,
        linen_calculation,
        guest_email: form.guest_email || null,
        guest_phone: form.guest_phone || null,
        notes: form.notes || null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    form: Partial<ReservationFormData>,
    property?: Property
  ): Promise<Reservation> {
    let linen_calculation = undefined;
    if (property && form.beds_double_used !== undefined) {
      linen_calculation = calculateLinen(
        {
          nb_couples: form.nb_couples ?? 0,
          nb_solo_adults: form.nb_solo_adults ?? 0,
          nb_children: form.nb_children ?? 0,
        },
        {
          beds_double_used: form.beds_double_used ?? 0,
          beds_single_used: form.beds_single_used ?? 0,
          beds_sofa_used: form.beds_sofa_used ?? 0,
          beds_crib_used: form.beds_crib_used ?? 0,
        },
        property.nb_bathrooms
      );
    }

    const { data, error } = await supabase
      .from('reservations')
      .update({ ...form, ...(linen_calculation ? { linen_calculation } : {}) })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('reservations').delete().eq('id', id);
    if (error) throw error;
  },
};
