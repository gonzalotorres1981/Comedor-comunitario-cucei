// =====================================================================
//  js/donaciones.js — Formulario de donaciones (donaciones.html)
//  Responsable: Persona 4 (formularios)
//
//  Qué debe hacer:
//  - Recibir el tipo de donación (agua, despensa o dinero), la cantidad,
//    un detalle opcional y los datos de contacto (opcionales).
//  - Guardar la donación en la tabla `donaciones`.
//  - Avisar al usuario si se registró o si hubo un error.
//
//  Avisos importantes:
//  - Inserta con sb.from('donaciones').insert({...}) SIN encadenar .select():
//    el público no tiene permiso de lectura y el insert fallaría.
//  - A diferencia de reservas y voluntariado, aquí SÍ se permite donar
//    varias veces con el mismo correo, así que el error 23505 (duplicado)
//    no debería aparecer.
//  - Campos de la tabla: tipo ('agua' | 'despensa' | 'dinero'), cantidad (> 0),
//    descripcion, nombre y correo (opcionales) y acepto_privacidad.
//  - acepto_privacidad debe enviarse en true (casilla obligatoria del aviso
//    de privacidad); si no, la base de datos rechaza el registro.
//  - No envíes `recibida`: la marca el comedor desde el panel.
//  - `sb` ya existe: viene de js/supabase.js.
// =====================================================================
