// =====================================================================
//  js/admin.js — Lógica del panel de administración (admin.html)
//  Responsable: Persona 3: Luz (base de datos)
//
//  Script clásico (sin type="module"): admin.html usa onclick/onchange
//  que llaman funciones globales como guardarPlatos() y marcar().
//  La conexión `sb` viene de js/supabase.js, que se carga antes.
// =====================================================================

const $ = (id) => document.getElementById(id);

// Evita que un nombre escrito por alguien del público se ejecute como código
const esc = (t) =>
  String(t ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const fechaBonita = (f) => {
  const t = new Date(f + "T12:00").toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const fechaCorta = (f) =>
  new Date(f + "T12:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const horaCorta = (ts) =>
  new Date(ts).toLocaleString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const hoyISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

function mensaje(id, texto, tipo) {
  const el = $(id);
  el.textContent = texto;
  el.className = "msg " + (tipo || "");
  if (tipo === "ok")
    setTimeout(() => {
      if (el.textContent === texto) el.textContent = "";
    }, 4000);
}

// ============ SESIÓN ============
async function iniciar() {
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) return mostrarLogin();
  const { data: esAdmin } = await sb.rpc("es_admin");
  if (!esAdmin) {
    await sb.auth.signOut();
    mostrarLogin("Esta cuenta no tiene permisos de administración.");
    return;
  }
  $("login").hidden = true;
  $("panel").hidden = false;
  cargarMartes();
}

function mostrarLogin(error) {
  $("panel").hidden = true;
  $("login").hidden = false;
  $("msg-login").textContent = error || "";
}

$("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  btn.disabled = true;
  const { error } = await sb.auth.signInWithPassword({
    email: $("correo").value.trim(),
    password: $("pass").value,
  });
  btn.disabled = false;
  if (error) return mostrarLogin("Error: " + error.message);
  iniciar();
});

$("salir").addEventListener("click", async () => {
  await sb.auth.signOut();
  mostrarLogin();
});

// ============ PESTAÑAS ============
const cargadores = {
  martes: cargarMartes,
  reservas: cargarSelectReservas,
  donaciones: cargarDonaciones,
  voluntariado: cargarTurnos,
};
document.querySelectorAll("nav button").forEach((b) =>
  b.addEventListener("click", () => {
    document
      .querySelectorAll("nav button")
      .forEach((x) => x.setAttribute("aria-selected", x === b));
    Object.keys(cargadores).forEach(
      (t) => ($("tab-" + t).hidden = t !== b.dataset.tab),
    );
    cargadores[b.dataset.tab]();
  }),
);

// ============ MARTES ============
let menus = [];

async function cargarMartes() {
  const { data, error } = await sb
    .from("menus")
    .select("*, reservas(count)")
    .order("fecha", { ascending: false });
  if (error) {
    $("lista-menus").innerHTML =
      `<tr><td colspan="6" class="vacio">No se pudieron cargar los menús: ${esc(error.message)}</td></tr>`;
    return;
  }
  menus = data.map((m) => ({ ...m, total: m.reservas?.[0]?.count ?? 0 }));
  pintarHoy();
  pintarListaMenus();
}

function pintarHoy() {
  // El martes de hoy o el siguiente; si no hay, el más reciente
  const hoy = hoyISO();
  const futuros = menus
    .filter((m) => m.fecha >= hoy)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const m = futuros[0] || menus[0];
  if (!m) {
    $("hoy").innerHTML =
      `<div class="hoja hoy"><h2>Aún no hay menús</h2><p class="platillo">Publica el primer martes con el formulario de abajo.</p></div>`;
    return;
  }
  const abierto = new Date(m.cierre_reservas) > new Date();
  $("hoy").innerHTML = `
    <div class="hoja hoy">
      <h2>${esc(fechaBonita(m.fecha))}</h2>
      <p class="platillo">${esc(m.platillo)} · <span class="chip">${abierto ? "Reservas abiertas hasta " + esc(horaCorta(m.cierre_reservas)) : "Reservas cerradas"}</span></p>
      <div class="cifras">
        <div class="cifra"><label>Reservas</label><div class="n">${m.total} <small style="font-size:18px">/ ${m.porciones_disponibles}</small></div></div>
        <div class="cifra"><label for="hoy-prep">Platos preparados</label><input id="hoy-prep" type="number" min="0" value="${m.platos_preparados ?? ""}"></div>
        <div class="cifra"><label for="hoy-serv">Platos servidos</label><input id="hoy-serv" type="number" min="0" value="${m.platos_servidos ?? ""}"></div>
        <div><button class="btn" id="hoy-guardar">Guardar platos</button></div>
      </div>
      <div class="msg" id="msg-hoy" role="status"></div>
    </div>`;
  $("hoy-guardar").addEventListener("click", () =>
    guardarPlatos(m.id, $("hoy-prep").value, $("hoy-serv").value, "msg-hoy"),
  );
}

function pintarListaMenus() {
  if (!menus.length) {
    $("lista-menus").innerHTML =
      `<tr><td colspan="6" class="vacio">Todavía no hay martes registrados.</td></tr>`;
    return;
  }
  $("lista-menus").innerHTML = menus
    .map(
      (m) => `
    <tr>
      <td>${esc(fechaCorta(m.fecha))}${m.es_linea_base ? ' <span class="chip">línea base</span>' : ""}</td>
      <td>${esc(m.platillo)}</td>
      <td>${m.total}</td>
      <td><input type="number" min="0" id="p-${m.id}" value="${m.platos_preparados ?? ""}" aria-label="Platos preparados"></td>
      <td><input type="number" min="0" id="s-${m.id}" value="${m.platos_servidos ?? ""}" aria-label="Platos servidos"></td>
      <td><button class="btn sec" onclick="guardarPlatos(${m.id}, $('p-${m.id}').value, $('s-${m.id}').value, 'msg-menu')">Guardar</button></td>
    </tr>`,
    )
    .join("");
}

async function guardarPlatos(id, prep, serv, msgId) {
  const p = prep === "" ? null : Number(prep),
    s = serv === "" ? null : Number(serv);
  if (p !== null && s !== null && s > p)
    return mensaje(
      msgId,
      "Los platos servidos no pueden ser más que los preparados.",
      "err",
    );
  const { error } = await sb
    .from("menus")
    .update({ platos_preparados: p, platos_servidos: s })
    .eq("id", id);
  if (error) return mensaje(msgId, "No se guardó: " + error.message, "err");
  mensaje(msgId, "Platos guardados.", "ok");
  cargarMartes();
}

$("m-fecha").addEventListener("change", () => {
  // Sugerir el lunes anterior como día de cierre
  if (!$("m-fecha").value) return;
  const d = new Date($("m-fecha").value + "T12:00");
  d.setDate(d.getDate() - 1);
  $("m-cierre-f").value = d.toISOString().slice(0, 10);
});

$("form-menu").addEventListener("submit", async (e) => {
  e.preventDefault();
  const cierre = new Date($("m-cierre-f").value + "T" + $("m-cierre-h").value);
  const { error } = await sb.from("menus").insert({
    fecha: $("m-fecha").value,
    platillo: $("m-platillo").value.trim(),
    descripcion: $("m-desc").value.trim() || null,
    porciones_disponibles: Number($("m-porciones").value),
    cierre_reservas: cierre.toISOString(),
  });
  if (error)
    return mensaje(
      "msg-menu",
      error.code === "23505"
        ? "Ya existe un menú para esa fecha."
        : "No se publicó: " + error.message,
      "err",
    );
  e.target.reset();
  $("m-cierre-h").value = "18:00";
  mensaje("msg-menu", "Menú publicado.", "ok");
  cargarMartes();
});

// ============ RESERVAS ============
async function cargarSelectReservas() {
  if (!menus.length) await cargarMartes();
  const sel = $("r-menu"),
    previo = sel.value;
  sel.innerHTML = menus
    .map(
      (m) =>
        `<option value="${m.id}">${esc(fechaCorta(m.fecha))} · ${esc(m.platillo)}</option>`,
    )
    .join("");
  if (previo) sel.value = previo;
  cargarReservas();
}
$("r-menu").addEventListener("change", cargarReservas);

async function cargarReservas() {
  const id = $("r-menu").value;
  if (!id) {
    $("r-titulo").textContent = "";
    $("lista-reservas").innerHTML =
      `<tr><td colspan="5" class="vacio">Publica un menú para ver sus reservas.</td></tr>`;
    return;
  }
  const m = menus.find((x) => String(x.id) === id);
  const { data, error } = await sb
    .from("reservas")
    .select("*")
    .eq("menu_id", id)
    .order("nombre");
  if (error) {
    $("lista-reservas").innerHTML =
      `<tr><td colspan="5" class="vacio">${esc(error.message)}</td></tr>`;
    return;
  }
  $("r-titulo").textContent =
    `${fechaBonita(m.fecha)}: ${data.length} reservas`;
  $("lista-reservas").innerHTML = data.length
    ? data
        .map(
          (r) => `
    <tr><td>${esc(r.nombre)}</td><td>${esc(r.correo)}</td><td>${esc(r.carrera)}</td><td>${r.semestre}</td><td>${esc(horaCorta(r.created_at))}</td></tr>`,
        )
        .join("")
    : `<tr><td colspan="5" class="vacio">Nadie ha reservado para este martes todavía.</td></tr>`;
}

// ============ DONACIONES ============
const nombreTipo = {
  agua: "Agua (garrafones)",
  despensa: "Despensa",
  dinero: "Dinero ($)",
};

async function cargarDonaciones() {
  const { data, error } = await sb
    .from("donaciones")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    $("lista-donaciones").innerHTML =
      `<tr><td colspan="6" class="vacio">${esc(error.message)}</td></tr>`;
    return;
  }
  $("lista-donaciones").innerHTML = data.length
    ? data
        .map(
          (d) => `
    <tr>
      <td>${esc(horaCorta(d.created_at))}</td>
      <td>${esc(nombreTipo[d.tipo] || d.tipo)}</td>
      <td>${Number(d.cantidad)}</td>
      <td>${esc(d.descripcion || "")}</td>
      <td>${esc(d.nombre || "Anónimo")}${d.correo ? "<br><small>" + esc(d.correo) + "</small>" : ""}</td>
      <td><input type="checkbox" ${d.recibida ? "checked" : ""} aria-label="Recibida" onchange="marcar('donaciones', ${d.id}, 'recibida', this, 'msg-don')"></td>
    </tr>`,
        )
        .join("")
    : `<tr><td colspan="6" class="vacio">Aún no hay donaciones registradas.</td></tr>`;
}

async function marcar(tabla, id, campo, casilla, msgId) {
  casilla.disabled = true;
  const { error } = await sb
    .from(tabla)
    .update({ [campo]: casilla.checked })
    .eq("id", id);
  casilla.disabled = false;
  if (error) {
    casilla.checked = !casilla.checked;
    mensaje(msgId, "No se guardó: " + error.message, "err");
  }
}

// ============ VOLUNTARIADO ============
const nombreAct = {
  cocinar: "Cocinar",
  servir: "Servir",
  lavar: "Lavar trastes",
};

async function cargarTurnos() {
  const { data, error } = await sb
    .from("turnos")
    .select("*, voluntarios(*)")
    .order("fecha", { ascending: false })
    .order("hora_inicio");
  if (error) {
    $("lista-turnos").innerHTML = `<p class="vacio">${esc(error.message)}</p>`;
    return;
  }
  $("lista-turnos").innerHTML = data.length
    ? data
        .map(
          (t) => `
    <div class="turno">
      <strong>${esc(fechaCorta(t.fecha))} · ${esc(nombreAct[t.actividad])} · ${esc(t.hora_inicio.slice(0, 5))} (${Number(t.horas)} h)</strong>
      <span class="chip">${t.voluntarios.length} / ${t.cupo}</span>
      ${
        t.voluntarios.length
          ? `<div class="scroll"><table class="tabla" style="margin-top:6px"><tbody>
        ${t.voluntarios
          .map(
            (v) => `<tr><td>${esc(v.nombre)}</td><td>${esc(v.correo)}</td>
          <td style="width:110px"><label style="display:flex;gap:6px;align-items:center;margin:0">
          <input type="checkbox" ${v.asistio ? "checked" : ""} onchange="marcar('voluntarios', ${v.id}, 'asistio', this, 'msg-turno')"> Asistió</label></td></tr>`,
          )
          .join("")}
      </tbody></table></div>`
          : `<p style="margin:6px 0 0">Nadie inscrito todavía.</p>`
      }
    </div>`,
        )
        .join("")
    : `<p class="vacio">No hay turnos. Crea el primero con el formulario de arriba.</p>`;
}

$("form-turno").addEventListener("submit", async (e) => {
  e.preventDefault();
  const { error } = await sb.from("turnos").insert({
    fecha: $("t-fecha").value,
    actividad: $("t-act").value,
    hora_inicio: $("t-hora").value,
    horas: Number($("t-horas").value),
    cupo: Number($("t-cupo").value),
  });
  if (error)
    return mensaje("msg-turno", "No se creó el turno: " + error.message, "err");
  e.target.reset();
  mensaje("msg-turno", "Turno creado.", "ok");
  cargarTurnos();
});

iniciar();
