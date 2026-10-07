// =====================================================================
//  js/reservas.js — Formulario de reservas (menu.html)
//  Responsable: Persona 4 (formularios)
//
//  Qué debe hacer:
//  - Mostrar el menú del martes y cuántos lugares quedan.
//  - Recibir nombre, correo, carrera y semestre, y guardar la reserva
//    en la tabla `reservas`.
//  - Avisar al usuario si la reserva se guardó o si hubo un error.
//
//  Avisos importantes:
//  - Inserta con sb.from('reservas').insert({...}) SIN encadenar .select():
//    el público no tiene permiso de lectura y el insert fallaría.
//  - Si el error trae code === "23505", es un registro duplicado
//    (ese correo ya reservó para este martes).
//  - Para mostrar los lugares disponibles usa:
//      sb.rpc('reservas_del_menu', { p_menu_id })
//  - Campos de la tabla: menu_id, nombre, correo, carrera, semestre (1 a 12)
//    y acepto_privacidad, que debe enviarse en true (casilla obligatoria del
//    aviso de privacidad); si no, la base de datos rechaza el registro.
//  - Si ya pasó la hora de cierre o se acabaron las porciones, el insert
//    falla con code === "42501" (lo bloquea la seguridad de la base de datos).
//  - `sb` ya existe: viene de js/supabase.js.
// =====================================================================
