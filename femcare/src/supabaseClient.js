// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Direct configuration - replace these with your actual Supabase credentials
const supabaseUrl = 'https://oolghmirlqihibejvsux.supabase.co'  // Replace with your Supabase URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbGdobWlybHFpaGliZWp2c3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NzgzNjcsImV4cCI6MjA1ODA1NDM2N30.1lFnH4urPsz6-uz9YPcbVZ1z887sVWEcaUih6jNL5SY'  // Replace with your Supabase anon key

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)