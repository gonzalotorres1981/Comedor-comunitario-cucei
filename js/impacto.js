// =====================================================================
//  js/impacto.js — Dashboard de impacto (impacto.html)
//  Responsable: Persona 5 (impacto y correos)
//
//  Qué debe hacer:
//  - Pedir los datos a Supabase y dibujar las gráficas con Chart.js
//    (Chart.js se carga por CDN en impacto.html antes de este archivo).
//  - Mostrar el impacto del comedor relacionado con los ODS 2, 12 y 17.
//
//  Funciones de la base de datos para las gráficas:
//  - sb.rpc('resumen_semanal')            → platos preparados/servidos por semana
//  - sb.rpc('litros_de_agua')             → litros de agua donados
//  - sb.rpc('beneficiados_por_carrera')   → beneficiados por carrera
//  - sb.rpc('beneficiados_por_semestre')  → beneficiados por semestre
//  - sb.rpc('horas_voluntariado')         → horas de voluntariado
//
//  `sb` ya existe: viene de js/supabase.js.
// =====================================================================
