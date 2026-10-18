// =====================================================================
//  js/voluntariado.js — Turnos de voluntariado e inscripción (voluntariado.html)
//  Responsable: Persona 4 (formularios). Escrito con apoyo de Persona 3 (Luz).
//
//  Privacidad: NO se pide nombre ni correo. Cada inscripción recibe un
//  código de 4 caracteres y, si la persona quiere, un apodo. Para
//  coordinarse, la persona voluntaria escribe al comedor con su código.
//  Se guarda solo: turno_id, codigo, apodo (opcional), acepto_privacidad.
//  No se manda `asistio`: lo marca el comedor desde el panel.
//
//  Script clásico. La conexión `sb` viene de js/supabase.js.
// =====================================================================

const CORREO_COMEDOR = "cucei.comedorcomunitario@gmail.com";
const INSTAGRAM = "@movimientoestudiantil_cucei";
const ALFABETO_V = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0, O, 1, I

const ACTIVIDADES = {
  cocinar: {
    nombre: "Cocinar en casa",
    nota: "Se cocina en tu casa. Al inscribirte, escríbele al comedor con tu código para saber qué preparar y dónde entregarlo.",
    color: "#F7C744",
  },
  servir: {
    nombre: "Servir",
    nota: "Ayudas a repartir los platos en el comedor.",
    color: "#9DB7F2",
  },
  lavar: {
    nombre: "Lavar trastes",
    nota: "Se lava varias veces durante el servicio, según se van acabando los platos.",
    color: "#F08BC0",
  },
};

const cajaTurnos = document.getElementById("turnos");

// ---------- utilidades ----------
const escV = (t) =>
  String(t ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const hoyV = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const diaLargo = (f) =>
  new Date(f + "T12:00").toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

const horaLegible = (h) =>
  new Date("1970-01-01T" + h).toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
  });

function codigoNuevo() {
  const n = new Uint32Array(4);
  crypto.getRandomValues(n);
  return Array.from(n, (x) => ALFABETO_V[x % ALFABETO_V.length]).join("");
}

// El navegador recuerda en qué turnos ya se inscribió la persona
const claveTurno = (id) => "comedor_voluntario_" + id;
function codigoGuardado(id) {
  try {
    return localStorage.getItem(claveTurno(id));
  } catch {
    return null;
  }
}
function guardarCodigoTurno(id, codigo) {
  try {
    localStorage.setItem(claveTurno(id), codigo);
  } catch {
    /* Si no se puede guardar, el código igual se muestra en pantalla */
  }
}

// inscritos_en_turno puede regresar un número o una fila
function cuenta(data) {
  if (typeof data === "number") return data;
  if (Array.isArray(data)) return data.length ? cuenta(data[0]) : 0;
  if (data && typeof data === "object")
    return Number(Object.values(data)[0]) || 0;
  return Number(data) || 0;
}

// ---------- estilos compartidos (Tailwind) ----------
// Las clases tarjeta, chip, campo y btn viven en css/estilos.css
const TARJETA_V = "tarjeta";
const TITULO_V = "font-titulo text-h2 leading-tight";   // h2: Permanent Marker
const SUBTITULO_V = "text-h3 font-extrabold";            // h3 y avisos: Nunito 800
const CHIP_V = "chip";
const CAMPO_V = "campo";
const BOTON_V = "btn w-full sm:w-auto";

let turnos = [];

// ---------- carga ----------
async function cargarTurnosPublicos() {
  cajaTurnos.innerHTML = `<p class="font-bold">Cargando turnos…</p>`;
  const { data, error } = await sb
    .from("turnos")
    .select("id, fecha, actividad, hora_inicio, horas, cupo")
    .gte("fecha", hoyV())
    .order("fecha")
    .order("hora_inicio");

  if (error) {
    cajaTurnos.innerHTML = avisoV(
      "No se pudieron cargar los turnos",
      "Revisa tu conexión y recarga la página.",
    );
    return;
  }
  if (!data.length) {
    cajaTurnos.innerHTML = avisoV(
      "Todavía no hay turnos abiertos",
      `El comedor los publica junto con el menú de cada martes. Vuelve pronto o síguenos en ${INSTAGRAM}.`,
    );
    return;
  }

  const conteos = await Promise.all(
    data.map((t) => sb.rpc("inscritos_en_turno", { p_turno_id: t.id })),
  );
  turnos = data.map((t, i) => ({
    ...t,
    inscritos: conteos[i].error ? null : cuenta(conteos[i].data),
  }));
  pintarTurnos();
}

function avisoV(titulo, texto) {
  return `<div class="${TARJETA_V} bg-st-amarillo p-6 text-noche">
    <h2 class="${SUBTITULO_V} mb-2">${escV(titulo)}</h2>
    <p>${escV(texto)}</p>
  </div>`;
}

// ---------- pintado ----------
function pintarTurnos() {
  const porDia = {};
  turnos.forEach((t) => (porDia[t.fecha] ||= []).push(t));

  cajaTurnos.innerHTML = Object.entries(porDia)
    .map(
      ([fecha, lista]) => `
      <section class="mb-10">
        <h2 class="${TITULO_V} mb-4 text-secundario first-letter:uppercase">${escV(diaLargo(fecha))}</h2>
        <div class="space-y-6">${lista.map(tarjetaTurno).join("")}</div>
      </section>`,
    )
    .join("");

  cajaTurnos.querySelectorAll("[data-apuntarme]").forEach((b) =>
    b.addEventListener("click", () => abrirFormulario(Number(b.dataset.apuntarme))),
  );
}

function tarjetaTurno(t) {
  const act = ACTIVIDADES[t.actividad] || { nombre: t.actividad, nota: "", color: "#FFF4E8" };
  const quedan = t.inscritos === null ? null : Math.max(t.cupo - t.inscritos, 0);
  const codigo = codigoGuardado(t.id);

  let accion;
  if (codigo) accion = boletoTurno(t, codigo);
  else if (quedan === 0)
    accion = `<p class="font-bold mt-4">Este turno ya está completo.</p>`;
  else
    accion = `<div id="accion-${t.id}" class="mt-4">
      <button type="button" class="${BOTON_V}" data-apuntarme="${t.id}">Inscribirme</button>
    </div>`;

  return `
    <article id="turno-${t.id}" class="${TARJETA_V} overflow-hidden">
      <div class="flex items-center gap-3 border-b-2 border-borde px-6 py-3 text-noche" style="background:${act.color}">
        <span class="text-vino" aria-hidden="true">★</span>
        <h3 class="${SUBTITULO_V}">${escV(act.nombre)}</h3>
      </div>
      <div class="p-6">
        <div class="flex flex-wrap gap-2 mb-3">
          <span class="${CHIP_V}">${escV(horaLegible(t.hora_inicio))}, ${Number(t.horas)} h</span>
          ${quedan === null ? "" : `<span class="${CHIP_V}">Quedan ${quedan} de ${t.cupo} lugares</span>`}
        </div>
        <p>${escV(act.nota)}</p>
        ${accion}
      </div>
    </article>`;
}

function boletoTurno(t, codigo) {
  const act = ACTIVIDADES[t.actividad]?.nombre || t.actividad;
  const asunto = encodeURIComponent(
    `Voluntariado ${diaLargo(t.fecha)}, ${act}, código ${codigo}`,
  );
  return `
    <div class="mt-4 rounded-xl border-2 border-borde bg-superficie-alt p-5 text-center" aria-live="polite">
      <p class="font-bold"><span class="text-exito" aria-hidden="true">✓</span> Ya estás en este turno. Tu código:</p>
      <p class="my-3 inline-block rounded-xl border-2 border-dashed border-borde bg-st-amarillo px-6 py-2 text-5xl font-extrabold tracking-[0.25em] text-noche">${escV(codigo)}</p>
      <p class="text-left">Toma captura y escríbele al comedor con tu código para coordinarte:</p>
      <p class="mt-2"><a class="enlace break-all" href="mailto:${CORREO_COMEDOR}?subject=${asunto}">${CORREO_COMEDOR}</a></p>
      <p class="mt-1 font-bold">o por Instagram: ${escV(INSTAGRAM)}</p>
    </div>`;
}

// ---------- inscripción ----------
function abrirFormulario(id) {
  const t = turnos.find((x) => x.id === id);
  const caja = document.getElementById("accion-" + id);
  caja.innerHTML = `
    <form class="space-y-4 rounded-xl border-2 border-borde bg-superficie-alt p-5" novalidate>
      <p>No pedimos tu nombre ni tu correo.</p>
      <div>
        <label for="apodo-${id}" class="block font-bold mb-1">Apodo (opcional)</label>
        <input id="apodo-${id}" class="${CAMPO_V}" maxlength="30" autocomplete="off" placeholder="Como quieras que te diga el comedor">
      </div>
      <label class="flex gap-3 items-start">
        <input id="priv-${id}" type="checkbox" class="casilla mt-1">
        <span>Leí y acepto el <a href="privacidad.html" target="_blank" rel="noopener" class="enlace">aviso de privacidad</a> (se abre en otra pestaña).</span>
      </label>
      <button type="submit" class="${BOTON_V}">Confirmar inscripción</button>
      <p class="msg-error" role="alert"></p>
    </form>`;

  const form = caja.querySelector("form");
  const msg = form.querySelector("[role=alert]");
  document.getElementById("apodo-" + id).focus();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    if (!document.getElementById("priv-" + id).checked)
      return (msg.textContent =
        "Para inscribirte necesitas aceptar el aviso de privacidad.");

    const boton = form.querySelector("button");
    boton.disabled = true;
    boton.textContent = "Inscribiendo…";
    const apodo = document.getElementById("apodo-" + id).value.trim() || null;

    // Si el código se repite en este turno (23505), se intenta con otro
    for (let intento = 0; intento < 5; intento++) {
      const codigo = codigoNuevo();
      const { error } = await sb.from("voluntarios").insert({
        turno_id: id,
        codigo,
        apodo,
        acepto_privacidad: true,
      });

      if (!error) {
        guardarCodigoTurno(id, codigo);
        caja.outerHTML = boletoTurno(t, codigo);
        return;
      }
      if (error.code === "23505") continue;
      if (error.code === "42501") {
        msg.textContent = "Ya no se pudo: el turno se llenó o ya pasó.";
        setTimeout(cargarTurnosPublicos, 2500);
        return;
      }
      msg.textContent =
        "No se pudo completar la inscripción. Revisa tu conexión e inténtalo de nuevo.";
      boton.disabled = false;
      boton.textContent = "Confirmar inscripción";
      return;
    }
    msg.textContent = "No se pudo generar tu código. Inténtalo de nuevo.";
    boton.disabled = false;
    boton.textContent = "Confirmar inscripción";
  });
}

cargarTurnosPublicos();
