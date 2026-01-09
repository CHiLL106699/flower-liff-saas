/**
 * Supabase Client Configuration
 * 
 * 連接 YOKAGE Supabase 專案
 * Project: YOKAGE
 * Region: Northeast Asia (Tokyo)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://atjbwafqvyqniyybagsm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0amJ3YWZxdnlxbml5eWJhZ3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MTg1MDcsImV4cCI6MjA4MzQ5NDUwN30.iFYUd-dwha6nmPyCoqSS3-mWciozxXIBHvldTbvMkxo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// Database Types (Generated from Schema)
// ============================================================================

export interface Organization {
  id: number;
  name: string;
  slug: string;
  line_channel_id: string | null;
  line_channel_secret: string | null;
  line_channel_access_token: string | null;
  liff_id: string | null;
  logo_url: string | null;
  primary_color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  line_user_id: string;
  line_display_name: string | null;
  line_picture_url: string | null;
  is_registered: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrganizationUser {
  organization_id: number;
  user_id: number;
  role: 'admin' | 'staff' | 'customer';
  customer_real_name: string | null;
  customer_phone: string | null;
  is_bound: boolean;
  created_at: string;
}

export interface Treatment {
  id: number;
  organization_id: number;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: number;
  organization_id: number;
  user_id: number;
  staff_id: number | null;
  treatment_id: number;
  appointment_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * 檢查使用者在指定組織的註冊狀態
 */
export async function checkUserRegistration(
  lineUserId: string,
  organizationId: number
): Promise<OrganizationUser | null> {
  // 先查找 user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('line_user_id', lineUserId)
    .single();

  if (userError || !user) {
    return null;
  }

  // 查找 organization_user
  const { data: orgUser, error: orgUserError } = await supabase
    .from('organization_users')
    .select('*')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .single();

  if (orgUserError || !orgUser) {
    return null;
  }

  return orgUser;
}

/**
 * 註冊新使用者
 */
export async function registerNewUser(data: {
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl?: string;
  realName: string;
  phone: string;
  organizationId: number;
}): Promise<OrganizationUser> {
  // 1. 建立或更新 user
  const { data: user, error: userError } = await supabase
    .from('users')
    .upsert({
      line_user_id: data.lineUserId,
      line_display_name: data.lineDisplayName,
      line_picture_url: data.linePictureUrl,
      is_registered: true,
    }, {
      onConflict: 'line_user_id',
    })
    .select()
    .single();

  if (userError || !user) {
    throw new Error('建立使用者失敗');
  }

  // 2. 建立 organization_user
  const { data: orgUser, error: orgUserError } = await supabase
    .from('organization_users')
    .upsert({
      organization_id: data.organizationId,
      user_id: user.id,
      role: 'customer',
      customer_real_name: data.realName,
      customer_phone: data.phone,
      is_bound: true,
    }, {
      onConflict: 'organization_id,user_id',
    })
    .select()
    .single();

  if (orgUserError || !orgUser) {
    throw new Error('綁定組織失敗');
  }

  return orgUser;
}

/**
 * 取得組織資訊
 */
export async function getOrganization(id: number): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to get organization:', error);
    return null;
  }

  return data;
}

/**
 * 取得組織的療程列表
 */
export async function getTreatments(organizationId: number): Promise<Treatment[]> {
  const { data, error } = await supabase
    .from('treatments')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Failed to get treatments:', error);
    return [];
  }

  return data || [];
}

/**
 * 取得使用者的預約列表
 */
export async function getUserAppointments(
  userId: number,
  organizationId: number
): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      treatment:treatments(name, duration_minutes, price),
      staff:staff(name)
    `)
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .order('appointment_time', { ascending: false });

  if (error) {
    console.error('Failed to get appointments:', error);
    return [];
  }

  return data || [];
}
