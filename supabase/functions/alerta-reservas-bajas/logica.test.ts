// =====================================================================
//  logica.test.ts — Pruebas de la lógica (NO envían correos, NO usan
//  la base de datos). Ejecutar con:   deno test
// =====================================================================
import {
  construirCorreo,
  decidirAlerta,
  fechaHoyEnGuadalajara,
  proximoMartes,
} from "./logica.ts";

// Mini "assert" propio para no depender de librerías externas.
function igual(real: unknown, esperado: unknown, mensaje = "") {
  if (real !== esperado) {
    throw new Error(`${mensaje} → esperado: ${esperado}, obtenido: ${real}`);
  }
}

// ---- Tabla de escenarios del proyecto ----
Deno.test("20 reservas de 100 → enviar", () => {
  igual(decidirAlerta(20, 100).enviar, true);
});
Deno.test("49 reservas de 100 → enviar", () => {
  igual(decidirAlerta(49, 100).enviar, true);
});
Deno.test("50 reservas de 100 → NO enviar", () => {
  const d = decidirAlerta(50, 100);
  igual(d.enviar, false);
  igual(d.motivo, "reservas_suficientes");
});
Deno.test("80 reservas de 100 → NO enviar", () => {
  igual(decidirAlerta(80, 100).enviar, false);
});
Deno.test("0 reservas de 100 → enviar", () => {
  const d = decidirAlerta(0, 100);
  igual(d.enviar, true);
  igual(d.porcentaje, 0);
});
Deno.test("Consulta fallida (null) con capacidad 100 → NO enviar", () => {
  const d = decidirAlerta(null, 100);
  igual(d.enviar, false);
  igual(d.motivo, "error_consulta");
});
Deno.test("20 reservas con capacidad 0 → NO enviar", () => {
  const d = decidirAlerta(20, 0);
  igual(d.enviar, false);
  igual(d.motivo, "capacidad_invalida");
});

// ---- Casos extra de seguridad ----
Deno.test("Capacidad negativa o NaN → NO enviar", () => {
  igual(decidirAlerta(10, -5).enviar, false);
  igual(decidirAlerta(10, NaN).enviar, false);
});
Deno.test("Reservas negativas o con decimales → se tratan como error", () => {
  igual(decidirAlerta(-1, 100).motivo, "error_consulta");
  igual(decidirAlerta(10.5, 100).motivo, "error_consulta");
});

// ---- Fechas ----
Deno.test("Lunes 2026-11-02 → martes 2026-11-03", () => {
  igual(proximoMartes("2026-11-02"), "2026-11-03");
});
Deno.test("Sábado 2026-10-31 y domingo 2026-11-01 → martes 2026-11-03", () => {
  igual(proximoMartes("2026-10-31"), "2026-11-03");
  igual(proximoMartes("2026-11-01"), "2026-11-03");
});
Deno.test("Si hoy es martes → el martes de la semana siguiente", () => {
  igual(proximoMartes("2026-11-03"), "2026-11-10");
});
Deno.test("Cambio de año: lunes 2026-12-28 → 2026-12-29; martes 12-29 → 2027-01-05", () => {
  igual(proximoMartes("2026-12-28"), "2026-12-29");
  igual(proximoMartes("2026-12-29"), "2027-01-05");
});
Deno.test("Hora de Guadalajara (UTC-6): 13:00 UTC = 7:00 a. m. del lunes", () => {
  igual(fechaHoyEnGuadalajara(new Date("2026-11-02T13:00:00Z")), "2026-11-02");
});
Deno.test("A las 23:59 del lunes en Guadalajara todavía es lunes", () => {
  igual(fechaHoyEnGuadalajara(new Date("2026-11-03T05:59:00Z")), "2026-11-02");
  igual(fechaHoyEnGuadalajara(new Date("2026-11-03T06:00:00Z")), "2026-11-03");
});

// ---- Correo ----
Deno.test("El correo muestra cantidad y porcentaje, y no trae datos personales", () => {
  const c = construirCorreo(49, 100, 49, "2026-11-03", "2026-11-02");
  igual(c.asunto, "Alerta de reservas bajas para el comedor del martes");
  igual(c.texto.includes("49 reservas"), true);
  igual(c.texto.includes("49 %"), true);
  igual(c.texto.includes("martes 3 de noviembre"), true);
  igual(c.texto.includes("lunes 2 de noviembre de 2026"), true);
  igual(c.texto.includes("@"), false);
});
