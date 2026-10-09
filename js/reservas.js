// =====================================================================
//  js/reservas.js — Menú del próximo martes y formulario de reserva (menu.html)
//  Responsable: Persona 4 (formularios). Escrito con apoyo de Persona 3 (Luz).
//
//  Privacidad: NO se pide nombre ni correo. Cada reserva recibe un código
//  de 4 caracteres que la persona muestra el martes al recoger su plato.
//  Se guarda solo: menu_id, codigo, carrera, semestre, acepto_privacidad.
//
//  Script clásico. La conexión `sb` viene de js/supabase.js.
//  Para probar sin tocar el menú real: menu.html?menu=ID (ej. ?menu=3).
// =====================================================================

// Carreras que se ofrecen en el formulario. Revisar contra la oferta oficial de CUCEI.
const CARRERAS_CUCEI = [
  "Ingeniería Biomédica",
  "Ingeniería Civil",
  "Ingeniería en Alimentos y Biotecnología",
  "Ingeniería en Computación",
  "Ingeniería en Comunicaciones y Electrónica",
  "Ingeniería en Logística y Transporte",
  "Ingeniería en Topografía Geomática",
  "Ingeniería Fotónica",
  "Ingeniería Industrial",
  "Ingeniería Informática",
  "Ingeniería Mecánica Eléctrica",
  "Ingeniería Química",
  "Ingeniería Robótica",
  "Licenciatura en Ciencia de Materiales",
  "Licenciatura en Física",
  "Licenciatura en Matemáticas",
  "Licenciatura en Química",
  "Licenciatura en Químico Farmacéutico Biólogo",
];
const OTRAS_OPCIONES = [
  "Otra carrera de CUCEI",
  "Otro centro UdeG",
  "Personal UdeG",
];
const SIN_SEMESTRE = "Personal UdeG";
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0, O, 1, I

const cajaReserva = document.getElementById("reserva");

// ---------- utilidades ----------
const escR = (t) =>
  String(t ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const hoyLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const fechaLarga = (f) =>
  new Date(f + "T12:00").toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

const cierreLegible = (ts) =>
  new Date(ts).toLocaleString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });

function generarCodigo() {
  const n = new Uint32Array(4);
  crypto.getRandomValues(n);
  return Array.from(n, (x) => ALFABETO[x % ALFABETO.length]).join("");
}

// El navegador recuerda el código para no reservar dos veces el mismo martes
const claveLocal = (menuId) => "comedor_reserva_" + menuId;
function leerCodigo(menuId) {
  try {
    return localStorage.getItem(claveLocal(menuId));
  } catch {
    return null;
  }
}
function guardarCodigo(menuId, codigo) {
  try {
    localStorage.setItem(claveLocal(menuId), codigo);
  } catch {
    /* Si el navegador no deja guardar, el código igual se muestra en pantalla */
  }
}

// reservas_del_menu puede regresar un número o una fila; esto cubre ambos casos
function aNumero(data) {
  if (typeof data === "number") return data;
  if (Array.isArray(data)) return data.length ? aNumero(data[0]) : 0;
  if (data && typeof data === "object")
    return Number(Object.values(data)[0]) || 0;
  return Number(data) || 0;
}

// ---------- estilos compartidos (Tailwind) ----------
const TARJETA =
  "rounded-3xl border-[3px] border-[#3D2D28] shadow-[6px_6px_0_#3D2D28] p-6 sm:p-8";
const TITULO = "font-['Lilita_One'] text-[#3D2D28] leading-tight";
const CHIP =
  "inline-block rounded-full border-2 border-[#3D2D28] bg-[#FFFCF5] px-3 py-1 text-sm font-bold";
const CAMPO =
  "w-full rounded-xl border-2 border-[#3D2D28] bg-[#FFFCF5] px-3 py-2 text-base focus:outline-none focus:ring-4 focus:ring-[#9DC4EC]";
const BOTON =
  "rounded-full border-[3px] border-[#3D2D28] bg-[#43A592] px-6 py-3 font-extrabold text-white shadow-[4px_4px_0_#3D2D28] hover:translate-x-[1px] hover:translate-y-[1px] focus:outline-none focus:ring-4 focus:ring-[#9DC4EC] disabled:opacity-60";

// ---------- carga ----------
async function cargarMenu() {
  cajaReserva.innerHTML = `<p class="text-[#3D2D28]">Cargando el menú…</p>`;

  const forzado = new URLSearchParams(location.search).get("menu");
  let consulta = sb
    .from("menus")
    .select(
      "id, fecha, platillo, descripcion, porciones_disponibles, cierre_reservas",
    );
  consulta = forzado
    ? consulta.eq("id", forzado)
    : consulta
        .eq("es_linea_base", false)
        .gte("fecha", hoyLocal())
        .order("fecha")
        .limit(1);

  const { data, error } = await consulta;
  if (error) {
    cajaReserva.innerHTML = aviso(
      "No se pudo cargar el menú",
      "Revisa tu conexión y recarga la página.",
      "#F2A7C9",
    );
    return;
  }
  const menu = data[0];
  if (!menu) {
    cajaReserva.innerHTML = aviso(
      "Todavía no hay menú para el próximo martes",
      "El comedor lo publica entre miércoles y sábado. Vuelve pronto o síguenos en @movimientoestudiantil_cucei.",
      "#F4DE80",
    );
    return;
  }

  const r = await sb.rpc("reservas_del_menu", { p_menu_id: menu.id });
  const ocupados = r.error ? null : aNumero(r.data);
  pintar(menu, ocupados);
}

function aviso(titulo, texto, color) {
  return `<div class="${TARJETA}" style="background:${color}">
    <h2 class="${TITULO} text-2xl mb-2">${escR(titulo)}</h2>
    <p class="text-[#3D2D28] text-lg">${escR(texto)}</p>
  </div>`;
}

// ---------- pintado ----------
function pintar(menu, ocupados) {
  const cerrado = new Date(menu.cierre_reservas) <= new Date();
  const quedan =
    ocupados === null
      ? null
      : Math.max(menu.porciones_disponibles - ocupados, 0);
  const lleno = quedan === 0;
  const codigo = leerCodigo(menu.id);

  const tarjetaMenu = `
    <article class="${TARJETA} bg-[#F4DE80] mb-8">
      <p class="font-bold text-[#3D2D28] text-lg first-letter:uppercase">${escR(fechaLarga(menu.fecha))}</p>
      <h2 class="${TITULO} text-4xl sm:text-5xl my-2">${escR(menu.platillo)}</h2>
      ${menu.descripcion ? `<p class="text-[#3D2D28] text-lg mb-4">${escR(menu.descripcion)}</p>` : ""}
      <div class="flex flex-wrap gap-2 mt-3">
        ${quedan === null ? "" : `<span class="${CHIP}">Quedan ${quedan} de ${menu.porciones_disponibles} lugares</span>`}
        <span class="${CHIP}">${cerrado ? "Reservas cerradas" : "Reserva hasta el " + escR(cierreLegible(menu.cierre_reservas))}</span>
      </div>
    </article>`;

  let abajo;
  if (codigo) abajo = boleto(menu, codigo);
  else if (cerrado)
    abajo = aviso(
      "Las reservas para este martes ya cerraron",
      "Aún puedes llegar sin reserva: el comedor atiende mientras haya comida.",
      "#9DC4EC",
    );
  else if (lleno)
    abajo = aviso(
      "Ya no quedan lugares para reservar",
      "Puedes llegar sin reserva: el comedor atiende mientras haya comida.",
      "#9DC4EC",
    );
  else abajo = formulario();

  cajaReserva.innerHTML = tarjetaMenu + abajo;
  if (!codigo && !cerrado && !lleno) activarFormulario(menu);
}

function formulario() {
  const opciones = (lista) =>
    lista.map((c) => `<option value="${escR(c)}">${escR(c)}</option>`).join("");
  const semestres = Array.from(
    { length: 12 },
    (_, i) => `<option value="${i + 1}">${i + 1}</option>`,
  ).join("");

  return `
    <form id="form-reserva" class="${TARJETA} bg-[#FDF6E9] space-y-5" novalidate>
      <div>
        <h2 class="${TITULO} text-3xl">Reserva tu plato</h2>
        <p class="text-[#3D2D28] mt-1">No pedimos tu nombre ni tu correo. Al reservar te damos un código para recoger tu plato.</p>
      </div>

      <div>
        <label for="r-carrera" class="block font-bold text-[#3D2D28] mb-1">Carrera</label>
        <select id="r-carrera" class="${CAMPO}" required>
          <option value="">Elige tu carrera</option>
          <optgroup label="CUCEI">${opciones(CARRERAS_CUCEI)}</optgroup>
          <optgroup label="Otras opciones UdeG">${opciones(OTRAS_OPCIONES)}</optgroup>
        </select>
      </div>

      <div>
        <label for="r-semestre" class="block font-bold text-[#3D2D28] mb-1">Semestre</label>
        <select id="r-semestre" class="${CAMPO}" required>
          <option value="">Elige tu semestre</option>
          ${semestres}
        </select>
      </div>

      <label class="flex gap-3 items-start text-[#3D2D28]">
        <input id="r-privacidad" type="checkbox" class="mt-1 h-5 w-5 accent-[#43A592]" required>
        <span>Leí y acepto el <a href="privacidad.html" target="_blank" rel="noopener" class="underline font-bold">aviso de privacidad</a> (se abre en otra pestaña).</span>
      </label>

      <button type="submit" class="${BOTON}">Reservar mi plato</button>
      <p id="r-msg" class="font-bold text-[#B3261E]" role="alert"></p>
    </form>`;
}

function boleto(menu, codigo) {
  return `
    <section class="${TARJETA} bg-[#8CC9AF] text-center" aria-live="polite">
      <h2 class="${TITULO} text-3xl">Tu plato está reservado</h2>
      <p class="text-[#3D2D28] mt-1 first-letter:uppercase">${escR(fechaLarga(menu.fecha))}</p>
      <p class="my-6 inline-block rounded-2xl border-[3px] border-dashed border-[#3D2D28] bg-[#FFFCF5] px-8 py-4 font-['Lilita_One'] text-6xl tracking-[0.25em] text-[#3D2D28]">${escR(codigo)}</p>
      <ul class="text-left text-[#3D2D28] text-lg max-w-md mx-auto space-y-2 list-disc pl-6">
        <li>Toma captura de esta pantalla.</li>
        <li>El martes, di tu código al recoger tu plato.</li>
        <li>Lleva tu credencial UdeG.</li>
      </ul>
    </section>`;
}

// ---------- envío ----------
function activarFormulario(menu) {
  const form = document.getElementById("form-reserva");
  const carrera = document.getElementById("r-carrera");
  const semestre = document.getElementById("r-semestre");
  const privacidad = document.getElementById("r-privacidad");
  const msg = document.getElementById("r-msg");

  carrera.addEventListener("change", () => {
    const sinSem = carrera.value === SIN_SEMESTRE;
    semestre.disabled = sinSem;
    semestre.required = !sinSem;
    if (sinSem) semestre.value = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    if (!carrera.value) return (msg.textContent = "Elige tu carrera.");
    if (!semestre.disabled && !semestre.value)
      return (msg.textContent = "Elige tu semestre.");
    if (!privacidad.checked)
      return (msg.textContent =
        "Para reservar necesitas aceptar el aviso de privacidad.");

    const boton = form.querySelector("button[type=submit]");
    boton.disabled = true;
    boton.textContent = "Reservando…";

    // Si el código se repite en este martes (23505), se intenta con otro
    for (let intento = 0; intento < 5; intento++) {
      const codigo = generarCodigo();
      const { error } = await sb.from("reservas").insert({
        menu_id: menu.id,
        codigo,
        carrera: carrera.value,
        semestre: semestre.disabled ? null : Number(semestre.value),
        acepto_privacidad: true,
      });

      if (!error) {
        guardarCodigo(menu.id, codigo);
        cajaReserva.querySelector("form").outerHTML = boleto(menu, codigo);
        return;
      }
      if (error.code === "23505") continue;
      if (error.code === "42501") {
        msg.textContent =
          "Ya no se pudo reservar: las reservas cerraron o se acabaron los lugares.";
        setTimeout(cargarMenu, 2500);
        return;
      }
      msg.textContent =
        "No se pudo reservar. Revisa tu conexión e inténtalo de nuevo.";
      boton.disabled = false;
      boton.textContent = "Reservar mi plato";
      return;
    }
    msg.textContent = "No se pudo generar tu código. Inténtalo de nuevo.";
    boton.disabled = false;
    boton.textContent = "Reservar mi plato";
  });
}

cargarMenu();
