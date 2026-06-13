/*
 * Purpose: Creates and exports a configured Supabase client for cloud storage
 *          and database access.
 * Inputs:  AppConfig.supabase (URL and anonymous API key).
 * Outputs: Exported supabase client instance used by uploadService.
 */
import { createClient } from '@supabase/supabase-js';
import { AppConfig } from './AppConfig';

export const supabase = createClient(
  AppConfig.supabase.url,
  AppConfig.supabase.anonKey
);
