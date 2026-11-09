// =====================================================================
//  logica.ts — Reglas de la alerta (funciones "puras")
//  Responsable: Persona 5 (alertas por correo)
//
//  "Pura" significa que la función NO consulta la base de datos, NO
//  envía correos y NO lee secretos. Solo recibe datos y devuelve un
//  resultado. Por eso se puede probar fácil y sin riesgo.
// =====================================================================

// Según el equipo, la capacidad del comedor es siempre 100.
export const CAPACIDAD_COMEDOR = 100;

// Si las reservas son MENOS de este porcentaje de la capacidad, se avisa.
export const UMBRAL_PORCENTAJE = 50;

const ZONA_HORARIA = "America/Mexico_City"; // Guadalajara usa esta zona

// ---------------------------------------------------------------------
// FECHAS
// ---------------------------------------------------------------------

/**
 * Devuelve la fecha de HOY en Guadalajara con formato "AAAA-MM-DD".
 */
export function fechaHoyEnGuadalajara(ahora: Date = new Date()): string {
  // El idioma "en-CA" (inglés de Canadá) escribe las fechas como AAAA-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

/**
 * Dado un día ("AAAA-MM-DD"), devuelve el martes INMEDIATAMENTE SIGUIENTE.
 * Si "hoy" ya es martes, devuelve el martes de la semana próxima.
 * Ejemplo: lunes 2026-11-02 → martes 2026-11-03.
 */
export function proximoMartes(hoyISO: string): string {
  const [anio, mes, dia] = hoyISO.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const diaSemana = fecha.getUTCDay(); // 0 = domingo, 1 = lunes, 2 = martes...
  const diasQueFaltan = (2 - diaSemana + 7) % 7 || 7;
  fecha.setUTCDate(fecha.getUTCDate() + diasQueFaltan);
  return fecha.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------
// DECISIÓN: ¿SE ENVÍA LA ALERTA?
// ---------------------------------------------------------------------

export type MotivoDecision =
  | "reservas_bajas" // se debe enviar
  | "reservas_suficientes" // 50 % o más: no se envía
  | "error_consulta" // la consulta falló: no se envía
  | "capacidad_invalida"; // capacidad 0, negativa o no numérica: no se envía

export type Decision = {
  enviar: boolean;
  motivo: MotivoDecision;
  reservas: number | null;
  capacidad: number;
  porcentaje: number | null;
};

/**
 * Decide si se envía la alerta.
 * - reservas = null significa "la consulta FALLÓ". Esto NO es lo mismo que
 *   0 reservas, y nunca debe interpretarse como cero.
 */
export function decidirAlerta(
  reservas: number | null,
  capacidad: number,
): Decision {
  const base = { reservas, capacidad, porcentaje: null as number | null };

  // 1) Capacidad inválida → no se puede calcular nada.
  if (!Number.isFinite(capacidad) || capacidad <= 0) {
    return { ...base, enviar: false, motivo: "capacidad_invalida" };
  }

  // 2) Consulta fallida (o resultado que no es un entero válido) → no enviar.
  if (reservas === null || !Number.isInteger(reservas) || reservas < 0) {
    return { ...base, enviar: false, motivo: "error_consulta" };
  }

  const porcentaje = (reservas / capacidad) * 100;

  // Comparamos con multiplicaciones enteras para evitar errores de decimales:
  //   reservas / capacidad < 50 / 100   ⇔   reservas * 100 < capacidad * 50
  const bajas = reservas * 100 < capacidad * UMBRAL_PORCENTAJE;

  return {
    enviar: bajas,
    motivo: bajas ? "reservas_bajas" : "reservas_suficientes",
    reservas,
    capacidad,
    porcentaje,
  };
}

// ---------------------------------------------------------------------
// CORREO
// ---------------------------------------------------------------------

/** 49 → "49",  33.333 → "33.3" */
export function formatearPorcentaje(p: number): string {
  return String(Math.round(p * 10) / 10);
}

/** "2026-11-03" → "martes 3 de noviembre"  (con conAnio: "... de 2026") */
export function fechaLegible(fechaISO: string, conAnio = false): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(conAnio ? { year: "numeric" as const } : {}),
  })
    .format(new Date(Date.UTC(anio, mes - 1, dia, 12)))
    .replace(",", ""); // algunos sistemas escriben "martes, 3 de..."
}

export type Correo = { asunto: string; texto: string; html: string };

/**
 * Arma el correo. Solo usa números y la fecha del martes:
 * NO incluye nombres, correos, códigos ni otros datos personales.
 */
export function construirCorreo(
  reservas: number,
  capacidad: number,
  porcentaje: number,
  fechaMartesISO: string,
  fechaHoyISO: string, // día en que se generó el reporte (lunes)
): Correo {
  const pct = formatearPorcentaje(porcentaje);
  const fecha = fechaLegible(fechaMartesISO);
  const fechaReporte = fechaLegible(fechaHoyISO, true);
  const palabra = reservas === 1 ? "reserva" : "reservas";

  const asunto = "Alerta de reservas bajas para el comedor del martes";

  const parrafos = [
    "Buen día, equipo del Comedor Comunitario CUCEI:",
    `El sistema detectó que las reservas registradas para el próximo servicio del ${fecha}, se encuentran por debajo del ${UMBRAL_PORCENTAJE} % de la capacidad establecida.`,
    `Actualmente se registran ${reservas} ${palabra}, equivalentes al ${pct} % de la capacidad del comedor (${capacidad} lugares).`,
    "Se recomienda reforzar hoy la difusión del comedor en los canales oficiales para informar a la comunidad universitaria.",
    `Fecha del reporte: ${fechaReporte}.`,
    "Este mensaje se genera automáticamente a partir de los registros de reservas.",
  ];

  const texto = parrafos.join("\n\n");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#1f2937;max-width:560px">
  <p>${parrafos[0]}</p>
  <p>${parrafos[1]}</p>
  <p style="background:#fff7e0;border-left:4px solid #f7c744;padding:12px 16px">
    <strong>${reservas}</strong> ${palabra} registradas &middot; <strong>${pct} %</strong> de la capacidad (${capacidad} lugares)
  </p>
  <p>${parrafos[3]}</p>
  <p style="color:#6b7280;font-size:13px">${parrafos[4]}<br>${parrafos[5]}</p>
</div>`;

  return { asunto, texto, html };
}
