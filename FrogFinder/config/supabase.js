import { createClient } from '@supabase/supabase-js';
import { AppConfig } from './AppConfig';

export const supabase = createClient(
  AppConfig.supabase.url,
  AppConfig.supabase.anonKey
);
