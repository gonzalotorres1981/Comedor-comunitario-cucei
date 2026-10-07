// =====================================================================
//  js/supabase.js — Conexión única a Supabase para todo el sitio
//  Responsable: Persona 3: Luz (base de datos)
//
//  Aquí van la URL y la llave anon/publishable del proyecto
//  (Supabase → Project Settings → API). Esa llave es pública y está
//  protegida por las reglas RLS de la base de datos.
//
//  NUNCA pongas aquí la secret key ni la service_role key: este archivo
//  se descarga en el navegador de cualquier visitante y se sube a GitHub.
//
//  Debe cargarse DESPUÉS del CDN de supabase-js y ANTES del script de
//  cada página, que usan la constante `sb` definida aquí.
// =====================================================================

const SUPABASE_URL = "https://gjwbwwyblhuactfmyfse.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqd2J3d3libGh1YWN0Zm15ZnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzMzQ2NTcsImV4cCI6MjEwNjkxMDY1N30.YSmmUukBHCTsbABw4huUrUrUlAMaSgCjt52Nf7MFuvg";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
