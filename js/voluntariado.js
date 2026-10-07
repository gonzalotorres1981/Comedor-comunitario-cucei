// =====================================================================
//  js/voluntariado.js — Inscripción a turnos de voluntariado (voluntariado.html)
//  Responsable: Persona 4 (formularios)
//
//  Qué debe hacer:
//  - Mostrar los turnos disponibles (cocinar, servir, lavar trastes)
//    con su fecha, hora, duración y cupo restante.
//  - Recibir nombre y correo, y guardar la inscripción en la tabla
//    `voluntarios`.
//  - Avisar al usuario si se inscribió o si hubo un error.
//
//  Avisos importantes:
//  - Inserta con sb.from('voluntarios').insert({...}) SIN encadenar .select():
//    el público no tiene permiso de lectura y el insert fallaría.
//  - Si el error trae code === "23505", es un registro duplicado
//    (ese correo ya está inscrito en el turno).
//  - Para mostrar los lugares disponibles de un turno usa:
//      sb.rpc('inscritos_en_turno', { p_turno_id })
//  - Campos de la tabla: turno_id, nombre, correo y acepto_privacidad, que
//    debe enviarse en true (casilla obligatoria del aviso de privacidad);
//    si no, la base de datos rechaza el registro.
//  - No envíes `asistio`: lo marca el comedor desde el panel.
//  - Si el turno ya pasó o está lleno, el insert falla con code === "42501"
//    (lo bloquea la seguridad de la base de datos).
//  - `sb` ya existe: viene de js/supabase.js.
// =====================================================================
