// =====================================================================
//  js/invitaciones.js — Galería (galeria.html) y última invitación (index.html)
//  Las imágenes viven en el bucket "invitaciones" de Supabase Storage,
//  con nombre AAAA-MM-DD.webp (la fecha del martes).
// =====================================================================

const BUCKET = "invitaciones";
const EXTENSIONES = /\.(webp|jpe?g|png|avif)$/i;
const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})/;

const escI = (t) =>
  String(t ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------- fechas ----------
function fechaDeNombre(nombre) {
  const m = nombre.match(PATRON_FECHA);
  if (!m) return null;
  const [a, mes, dia] = [+m[1], +m[2], +m[3]];
  const d = new Date(a, mes - 1, dia, 12);
  return d.getMonth() === mes - 1 && d.getDate() === dia ? d : null; // descarta fechas imposibles
}
const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const fechaCorta = (d) =>
  d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
const fechaLarga = (d) =>
  mayus(d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));

const textoCorto = (inv) => (inv.fecha ? fechaCorta(inv.fecha) : "Sin fecha");
const textoLargo = (inv) => (inv.fecha ? fechaLarga(inv.fecha) : "Invitación sin fecha");

// Más reciente primero; las que no tienen fecha, al final
function orden(a, b) {
  if (a.fecha && b.fecha) return b.fecha - a.fecha || a.nombre.localeCompare(b.nombre);
  if (a.fecha) return -1;
  if (b.fecha) return 1;
  return a.nombre.localeCompare(b.nombre);
}

let lista = [];

// ---------- visor (ventana de imagen en grande) ----------
let visor, indiceVisor = 0;

function crearVisor() {
  if (visor) return;
  visor = document.createElement("dialog");
  visor.className = "visor";
  visor.setAttribute("aria-label", "Invitación en grande");
  const boton =
    "inline-flex items-center gap-1 rounded-full border-2 border-borde bg-superficie px-4 py-2 text-sm font-extrabold text-tinta transition-colors hover:bg-primario hover:text-sobre-primario disabled:opacity-40 disabled:hover:bg-superficie disabled:hover:text-tinta sm:text-base";
  visor.innerHTML = `
    <figure class="p-3 sm:p-5">
      <img id="visor-img" src="" alt="" class="mx-auto block max-h-[70vh] w-auto max-w-[80vw] rounded-xl object-contain sm:max-w-[min(80vw,720px)]">
      <figcaption id="visor-pie" class="mt-3 text-center text-lg font-extrabold sm:text-xl"></figcaption>
    </figure>
    <div class="flex items-center justify-between gap-2 border-t-2 border-borde p-3">
      <button type="button" id="visor-ant" class="${boton}"><span aria-hidden="true">❮</span><span class="sr-only sm:not-sr-only">Más reciente</span></button>
      <button type="button" id="visor-cerrar" class="${boton}">Cerrar</button>
      <button type="button" id="visor-sig" class="${boton}"><span class="sr-only sm:not-sr-only">Más antigua</span><span aria-hidden="true">❯</span></button>
    </div>`;
  document.body.appendChild(visor);

  visor.querySelector("#visor-cerrar").addEventListener("click", () => visor.close());
  visor.querySelector("#visor-ant").addEventListener("click", () => irA(indiceVisor - 1));
  visor.querySelector("#visor-sig").addEventListener("click", () => irA(indiceVisor + 1));
  // Clic fuera de la tarjeta (en el fondo oscuro) = cerrar
  visor.addEventListener("click", (e) => e.target === visor && visor.close());
  visor.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") irA(indiceVisor - 1);
    if (e.key === "ArrowRight") irA(indiceVisor + 1);
  });
}

function irA(i) {
  if (i < 0 || i >= lista.length) return;
  indiceVisor = i;
  const inv = lista[i];
  const img = visor.querySelector("#visor-img");
  img.src = inv.url;
  img.alt = `Invitación del comedor, ${textoLargo(inv)}`;
  visor.querySelector("#visor-pie").textContent = textoLargo(inv);
  visor.querySelector("#visor-ant").disabled = i === 0;
  visor.querySelector("#visor-sig").disabled = i === lista.length - 1;
  // Precarga las vecinas para que el cambio sea inmediato
  [i - 1, i + 1].forEach((j) => lista[j] && (new Image().src = lista[j].url));
}

function abrirVisor(i) {
  crearVisor();
  irA(i);
  if (!visor.open) visor.showModal();
}

// ---------- pintado ----------
function aviso(el, texto) {
  el.innerHTML =
    el.tagName === "UL"
      ? `<li class="col-span-full text-lg font-bold">${texto}</li>`
      : `<p class="text-lg font-bold">${texto}</p>`;
}

const COLORES_TARJETA = ["bg-st-rosa", "bg-st-amarillo", "bg-st-azul", "bg-st-bugambilia", "bg-st-verde", "bg-st-salmon", "bg-st-crema"];
const MS_SEMANA = 7 * 24 * 60 * 60 * 1000;

// El color depende de la semana de la fecha: no cambia cuando se agregan invitaciones
function colorDe(inv, i) {
  const n = inv.fecha ? Math.floor(inv.fecha.getTime() / MS_SEMANA) : i;
  return COLORES_TARJETA[n % COLORES_TARJETA.length];
}

function pintarGaleria(caja) {
  caja.innerHTML = lista
    .map(
      (inv, i) => `
    <li>
      <button type="button" data-invitacion="${i}" class="nota block w-full cursor-pointer ${colorDe(inv, i)} !p-3 text-center"
        aria-label="Ver en grande la invitación del ${escI(textoLargo(inv))}">
        <img src="${escI(inv.url)}" alt="Invitación del comedor, ${escI(textoLargo(inv))}" loading="lazy" decoding="async"
           class="aspect-[4/5] w-full rounded-lg border-2 border-noche object-cover">
        <span class="mt-3 block text-lg font-extrabold">${escI(textoCorto(inv))}</span>
      </button>
    </li>`,
    )
    .join("");
}

function pintarUltima(caja) {
  const inv = lista[0];
  caja.innerHTML = `
    <button type="button" data-invitacion="0" class="nota block w-full cursor-pointer bg-superficie !p-3"
      aria-label="Ver en grande la invitación del ${escI(textoLargo(inv))}">
      <span aria-hidden="true" class="cinta"></span>
      <img src="${escI(inv.url)}" alt="Invitación del comedor, ${escI(textoLargo(inv))}" decoding="async"
        class="aspect-[4/5] w-full rounded-lg object-cover">
    </button>
    <p class="mt-6 text-center text-xl font-extrabold">${escI(textoLargo(inv))}</p>
    <p class="mt-4 text-center">
      <a href="galeria.html" class="btn btn-sec">Ver todas las invitaciones</a>
    </p>`;
}

const FUENTE = "supabase"; // cambiar a "supabase" cuando Luz termine

async function cargarInvitaciones() {
  let items;
  if (FUENTE === "local") {
    const res = await fetch("img/invitaciones/lista.json");
    if (!res.ok) throw new Error("No se encontró lista.json");
    const nombres = await res.json();
    items = nombres.map((n) => ({ nombre: n, url: "img/invitaciones/" + encodeURIComponent(n) }));
  } else {
    const { data, error } = await sb.storage.from(BUCKET).list("", { limit: 500 });
    if (error) throw error;
    items = data.map((f) => ({
      nombre: f.name,
      url: sb.storage.from(BUCKET).getPublicUrl(f.name).data.publicUrl,
    }));
  }
  return items
    .filter((i) => EXTENSIONES.test(i.nombre))
    .map((i) => ({ ...i, fecha: fechaDeNombre(i.nombre) }))
    .sort(orden);
}

// ---------- arranque ----------
(async () => {
  const caja = document.getElementById("galeria-invitaciones");
  const ultima = document.getElementById("ultima-invitacion");
  if (!caja && !ultima) return;

  try {
    lista = await cargarInvitaciones();
  } catch {
    [caja, ultima].filter(Boolean).forEach((el) => aviso(el, "No se pudieron cargar las invitaciones. Revisa tu conexión y recarga la página."));
    return;
  }

  if (!lista.length) {
    [caja, ultima].filter(Boolean).forEach((el) => aviso(el, "Todavía no hay invitaciones publicadas."));
    return;
  }

  if (caja) pintarGaleria(caja);
  if (ultima) pintarUltima(ultima);

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-invitacion]");
    if (b) abrirVisor(Number(b.dataset.invitacion));
  });
})();