// =====================================================================
//  alerta-reservas-bajas — Edge Function
//  Responsable: Persona 5 (alertas por correo)
//
//  Cada lunes 7:00 a. m. (Guadalajara), Supabase Cron la invoca y ella:
//    1. Calcula la fecha del martes siguiente.
//    2. Busca el menú de ese martes en la tabla `menus` (por `fecha`).
//    3. Cuenta las reservas de ese menú (función `reservas_del_menu`,
//       la misma que usa la página para mostrar "Quedan X de Y").
//    4. Si las reservas son < 50 % de la capacidad (100), envía un correo
//       con Resend. Si no, no hace nada.
//
//  SEGURIDAD
//   - La verificación JWT de Supabase sigue ACTIVA (ver config.toml).
//   - Además exige el encabezado secreto `x-cron-secret`, porque la
//     llave anon es pública.
//   - Solo usa la llave anon (permisos mínimos): lee `menus` y llama a
//     `reservas_del_menu`, que ya son públicas en la página.
//   - Nunca escribe en logs llaves, correos ni datos personales.
//
//  SECRETOS QUE NECESITA (Supabase → Edge Functions → Secrets):
//    RESEND_API_KEY   tu llave de Resend
//    CRON_SECRET      una clave larga inventada por ti (ver guía)
//    ALERT_MODE       "prueba" (por defecto) o "real"
//    ALERT_TO_TEST    correo de tu cuenta de Resend (solo modo prueba)
//  Secretos extra para el ENVÍO REAL (se agregan después):
//    ALERT_TO_REAL    correo del comedor
//    ALERT_FROM_REAL  remitente de TU dominio verificado en Resend
//  (SUPABASE_URL y SUPABASE_ANON_KEY ya los inyecta Supabase solo.)
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  CAPACIDAD_COMEDOR,
  construirCorreo,
  decidirAlerta,
  fechaHoyEnGuadalajara,
  proximoMartes,
} from "./logica.ts";

// Tiempo máximo que esperamos la respuesta de Resend. Debe ser MENOR que el
// timeout de Cron (60 000 ms) para que la función alcance a registrar lo ocurrido.
const ESPERA_RESEND_MS = 40000;

// ---------- Respuestas y bitácora ----------

function responder(estado: number, cuerpo: Record<string, unknown>): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json" },
  });
}

/** Escribe una línea de bitácora. Nunca pases secretos ni correos aquí. */
function registrar(
  nivel: "info" | "warn" | "error",
  evento: string,
  datos: Record<string, unknown> = {},
) {
  console[nivel === "info" ? "log" : nivel](
    JSON.stringify({ evento, ...datos }),
  );
}

// ---------- Candado: comparar el secreto sin filtrar pistas ----------

async function secretosIguales(a: string, b: string): Promise<boolean> {
  const codificador = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", codificador.encode(a)),
    crypto.subtle.digest("SHA-256", codificador.encode(b)),
  ]);
  const ua = new Uint8Array(ha);
  const ub = new Uint8Array(hb);
  let diferencia = 0;
  for (let i = 0; i < ua.length; i++) diferencia |= ua[i] ^ ub[i];
  return diferencia === 0;
}

// ---------- Configuración de envío (prueba o real) ----------

type ConfigEnvio = { remitente: string; destinatario: string; esPrueba: boolean };

function leerConfigEnvio(): ConfigEnvio | null {
  const modo = Deno.env.get("ALERT_MODE") ?? "prueba";

  if (modo === "real") {
    // ===== CAMBIO PARA ENVÍO REAL =====
    // Cuando autoricen el envío real:
    //  1) verifica un dominio en Resend,
    //  2) crea los secretos ALERT_TO_REAL y ALERT_FROM_REAL,
    //  3) cambia el secreto ALERT_MODE a "real".
    const para = Deno.env.get("ALERT_TO_REAL");
    const de = Deno.env.get("ALERT_FROM_REAL");
    if (!para || !de) return null;
    return { remitente: de, destinatario: para, esPrueba: false };
  }

  // Modo prueba: SOLO se envía al correo autorizado por Resend.
  const para = Deno.env.get("ALERT_TO_TEST");
  if (!para) return null;
  return {
    remitente: "Comedor CUCEI <onboarding@resend.dev>",
    destinatario: para,
    esPrueba: true,
  };
}

// ---------- Programa principal ----------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") {
    return responder(405, { error: "Método no permitido" });
  }

  // 1) Candado propio (además del JWT que verifica Supabase)
  const secretoEsperado = Deno.env.get("CRON_SECRET");
  if (!secretoEsperado) {
    registrar("error", "falta_CRON_SECRET");
    return responder(500, { error: "Configuración incompleta" });
  }
  const secretoRecibido = req.headers.get("x-cron-secret") ?? "";
  if (!(await secretosIguales(secretoRecibido, secretoEsperado))) {
    registrar("warn", "intento_no_autorizado");
    return responder(401, { error: "No autorizado" });
  }

  // 2) Configuración
  const config = leerConfigEnvio();
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!config || !resendKey || !supabaseUrl || !anonKey) {
    registrar("error", "configuracion_incompleta");
    return responder(500, { error: "Configuración incompleta" });
  }

  // 3) Opciones de la petición (todas opcionales)
  //    dry_run: true            → calcula todo pero NO envía correo
  //    fecha_hoy: "AAAA-MM-DD"  → finge otro "hoy" (solo modo prueba)
  //    simulacion: {reservas, capacidad} → finge datos, no toca la BD
  //                                        (solo modo prueba)
  let opciones: {
    dry_run?: unknown;
    fecha_hoy?: unknown;
    simulacion?: { reservas?: unknown; capacidad?: unknown };
  } = {};
  try {
    const texto = await req.text();
    if (texto.trim() !== "") opciones = JSON.parse(texto);
  } catch {
    return responder(400, { error: "El cuerpo debe ser JSON válido" });
  }

  const dryRun = opciones.dry_run === true;
  const usaSimulacion =
    opciones.fecha_hoy !== undefined || opciones.simulacion !== undefined;
  if (usaSimulacion && !config.esPrueba) {
    return responder(400, { error: "Simulación no permitida en modo real" });
  }

  let hoy = fechaHoyEnGuadalajara();
  if (opciones.fecha_hoy !== undefined) {
    if (
      typeof opciones.fecha_hoy !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(opciones.fecha_hoy)
    ) {
      return responder(400, { error: "fecha_hoy debe ser AAAA-MM-DD" });
    }
    hoy = opciones.fecha_hoy;
  }
  const fechaMartes = proximoMartes(hoy);

  // 4) Obtener reservas y capacidad
  let reservas: number | null = null;
  let capacidad = CAPACIDAD_COMEDOR;

  if (opciones.simulacion !== undefined) {
    // --- Datos simulados (para pruebas de lógica) ---
    const sim = opciones.simulacion ?? {};
    reservas = typeof sim.reservas === "number" ? sim.reservas : null; // null = consulta fallida
    if (sim.capacidad !== undefined) capacidad = Number(sim.capacidad);
  } else {
    // --- Datos reales ---
    const sb = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 4a) Menú del martes (se identifica por la fecha)
    const { data: menu, error: errMenu } = await sb
      .from("menus")
      .select("id")
      .eq("fecha", fechaMartes)
      .maybeSingle();

    if (errMenu) {
      registrar("error", "error_consultando_menu", {
        codigo: errMenu.code,
        mensaje: errMenu.message,
      });
      return responder(500, { enviado: false, motivo: "error_consulta" });
    }
    if (!menu) {
      // Sin menú publicado no se manda ningún correo.
      registrar("warn", "sin_menu_publicado", { fechaMartes });
      return responder(200, {
        enviado: false,
        motivo: "sin_menu_publicado",
        fechaMartes,
      });
    }

    // 4b) Conteo de reservas del menú (igual que la página)
    const { data: conteo, error: errConteo } = await sb.rpc(
      "reservas_del_menu",
      { p_menu_id: menu.id },
    );
    if (errConteo) {
      registrar("error", "error_contando_reservas", {
        codigo: errConteo.code,
        mensaje: errConteo.message,
      });
      return responder(500, { enviado: false, motivo: "error_consulta" });
    }
    // Si la respuesta no es un número entero, se trata como FALLA (nunca como 0).
    reservas = typeof conteo === "number" ? conteo : null;
  }

  // 5) Decidir
  const decision = decidirAlerta(reservas, capacidad);
  registrar("info", "decision", {
    fechaMartes,
    reservas: decision.reservas,
    capacidad: decision.capacidad,
    motivo: decision.motivo,
    enviar: decision.enviar,
    dryRun,
    modo: config.esPrueba ? "prueba" : "real",
  });

  if (decision.motivo === "error_consulta") {
    return responder(500, { enviado: false, motivo: decision.motivo });
  }
  if (decision.motivo === "capacidad_invalida") {
    registrar("error", "capacidad_invalida", { capacidad: decision.capacidad });
    return responder(500, { enviado: false, motivo: decision.motivo });
  }
  if (!decision.enviar) {
    return responder(200, {
      enviado: false,
      motivo: decision.motivo,
      fechaMartes,
      reservas: decision.reservas,
      porcentaje: decision.porcentaje,
    });
  }
  if (dryRun) {
    return responder(200, {
      enviado: false,
      dry_run: true,
      se_enviaria: true,
      fechaMartes,
      reservas: decision.reservas,
      porcentaje: decision.porcentaje,
    });
  }

  // 6) Enviar el correo con Resend
  const correo = construirCorreo(
    decision.reservas as number,
    decision.capacidad,
    decision.porcentaje as number,
    fechaMartes,
    hoy,
  );

  // La llave de idempotencia hace que Resend ignore envíos repetidos del
  // mismo martes durante 24 horas (protege contra ejecuciones dobles).
  const llaveIdempotencia = `alerta-reservas-bajas/${
    config.esPrueba ? "prueba" : "real"
  }/${fechaMartes}`;

  let respuesta: Response;
  try {
    respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": llaveIdempotencia,
      },
      body: JSON.stringify({
        from: config.remitente,
        to: [config.destinatario],
        subject: (config.esPrueba ? "[PRUEBA] " : "") + correo.asunto,
        text: correo.texto,
        html: correo.html,
      }),
      signal: AbortSignal.timeout(ESPERA_RESEND_MS),
    });
  } catch (e) {
    const tipo = e instanceof Error ? e.name : "desconocido";
    const sinRespuesta = tipo === "TimeoutError" || tipo === "AbortError";
    if (sinRespuesta) {
      // OJO: Resend pudo haber recibido y enviado el correo aunque no
      // contestó a tiempo. Por eso NO se afirma que falló: se revisa en
      // el panel de Resend (sección Emails).
      registrar("warn", "resend_sin_respuesta_a_tiempo", {
        fechaMartes,
        nota: "el correo pudo haberse enviado; verificar en Resend",
      });
      return responder(504, { enviado: null, motivo: "resend_sin_respuesta" });
    }
    // Error de red u otro. Solo registramos el tipo de error.
    registrar("error", "error_comunicacion_resend", { tipo });
    return responder(502, { enviado: false, motivo: "error_comunicacion_resend" });
  }

  if (!respuesta.ok) {
    let nombre = "desconocido";
    let mensaje = "";
    try {
      const err = await respuesta.json();
      nombre = String(err?.name ?? nombre);
      mensaje = String(err?.message ?? "").slice(0, 200);
    } catch {
      /* la respuesta no era JSON */
    }

    // 409 invalid_idempotent_request: ya se envió una alerta para este martes
    // (con otro contenido, porque cambió el número de reservas). Es lo esperado.
    if (respuesta.status === 409 && nombre === "invalid_idempotent_request") {
      registrar("info", "alerta_ya_enviada", { fechaMartes });
      return responder(200, { enviado: false, motivo: "ya_enviada", fechaMartes });
    }

    registrar("error", "resend_rechazo_el_correo", {
      estado: respuesta.status,
      nombre,
      mensaje,
    });
    return responder(502, {
      enviado: false,
      motivo: "resend_rechazo",
      estado: respuesta.status,
      nombre,
    });
  }

  const resultado = await respuesta.json().catch(() => ({}));
  registrar("info", "correo_enviado", {
    fechaMartes,
    idCorreo: resultado?.id,
    modo: config.esPrueba ? "prueba" : "real",
  });
  return responder(200, {
    enviado: true,
    modo: config.esPrueba ? "prueba" : "real",
    fechaMartes,
    reservas: decision.reservas,
    porcentaje: decision.porcentaje,
  });
});
