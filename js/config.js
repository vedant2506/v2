// js/config.js

// PASTE YOUR SUPABASE URL AND ANON KEY HERE
const SUPABASE_URL = 'https://hrshatipygqtlqtjkozm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyc2hhdGlweWdxdGxxdGprb3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2Njc5MDIsImV4cCI6MjA3NTI0MzkwMn0.KKzsKiBOO9AlQqX-ickVMBA9qXexF-cgiVeMVFcF26M';

// Initialize the Supabase client
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);