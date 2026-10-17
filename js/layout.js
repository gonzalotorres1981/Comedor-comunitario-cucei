// js/layout.js — Header y footer compartidos por todas las páginas públicas
// Cada página tiene su papel de color (siempre con texto oscuro encima)
const PAGINAS = [
  { href: "index.html",        texto: "Inicio",       color: "#F7C744" },
  { href: "menu.html",         texto: "Menú",         color: "#F08BC0" },
  { href: "donaciones.html",   texto: "Donaciones",   color: "#9DB7F2" },
  { href: "voluntariado.html", texto: "Voluntariado", color: "#7AAD82" },
  { href: "impacto.html",      texto: "Impacto",      color: "#FFE4E4" },
  { href: "galeria.html",      texto: "Galería",      color: "#FF7A6B" },
];

// Citas del pie de página: se elige una al azar en cada visita.
// Para agregar las de los carteles, copia el texto tal cual y pon el autor.
const CITAS = [
  { texto: "La comida es un derecho, no un negocio.", autor: "" },
];

// Funciona con "menu.html" y con "/menu" (Netlify)
const quitarExt = (s) => s.replace(".html", "");
const actual = quitarExt(location.pathname.split("/").pop() || "index");

// Temporada de Día de Muertos: papel picado de cempasúchil del 25 oct al 10 nov.
// Para verla otro día: agrega ?temporada=muertos a la dirección.
const hoy = new Date();
const diaDelAnio = (hoy.getMonth() + 1) * 100 + hoy.getDate(); // 1025 = 25 de octubre
if ((diaDelAnio >= 1025 && diaDelAnio <= 1110) || new URLSearchParams(location.search).get("temporada") === "muertos")
  document.body.classList.add("temporada-muertos");

const enlace = (p, movil) => {
  const base = movil
        ? "block rounded-xl border-2 border-borde bg-[var(--c)] px-5 py-3 text-center text-xl font-extrabold text-noche shadow-dura transition duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-dura-press active:translate-x-[4px] active:translate-y-[4px] active:shadow-none motion-reduce:transition-none aria-[current=page]:-rotate-2 aria-[current=page]:before:content-['★'] aria-[current=page]:before:mr-2 aria-[current=page]:before:text-vino"
        : "block rounded-full border-2 border-transparent px-1 py-2 text-center font-extrabold text-crema transition-colors duration-200 hover:border-noche hover:bg-[var(--c)] hover:text-noche aria-[current=page]:border-noche aria-[current=page]:bg-[var(--c)] aria-[current=page]:text-noche aria-[current=page]:shadow-[3px_3px_0_#0E1A33]";
    const activa = quitarExt(p.href) === actual ? 'aria-current="page"' : "";
  return `<a href="${p.href}" ${activa} style="--c:${p.color}" class="${base}">${p.texto}</a>`;
};

const cita = CITAS[Math.floor(Math.random() * CITAS.length)];

const HEADER = `
<header class="sticky top-0 z-30 lg:static">
  <div class="zona-oscura bg-talavera text-crema">
    <div class="mx-auto max-w-6xl px-4 py-3">
      <div class="grid grid-cols-[3rem_1fr_3rem] items-center lg:grid-cols-1">
        <button id="btn-menu" type="button" aria-expanded="false" aria-controls="menu-movil" aria-label="Abrir menú"
          class="grid h-12 w-12 place-items-center rounded-xl lg:hidden">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <a href="index.html" class="justify-self-center rounded-lg">
          <img src="img/logo-comcom.svg" alt="Comedor Comunitario" class="h-24 w-auto sm:h-28 lg:h-36 transition-transform duration-300 ease-out hover:-translate-y-1 motion-reduce:transition-none">
        </a>
      </div>
      <nav aria-label="Principal" class="mt-4 hidden pb-1 lg:block">
        <ul class="grid grid-cols-6 gap-3">${PAGINAS.map((p) => `<li>${enlace(p, false)}</li>`).join("")}</ul>
      </nav>
    </div>
  </div>
  <div class="papel-picado" aria-hidden="true"></div>
</header>

<!-- Menú móvil -->
<div id="capa" class="fixed inset-0 z-40 bg-noche/70 opacity-0 pointer-events-none transition-opacity duration-300 data-[open=true]:opacity-100 data-[open=true]:pointer-events-auto lg:hidden"></div>
<aside id="menu-movil" inert aria-label="Menú de navegación"
  class="group bg-fondo text-tinta border-r-2 border-borde scroll-papel overscroll-contain flex flex-col invisible fixed inset-y-0 left-0 z-50 w-[88%] max-w-sm -translate-x-full overflow-y-auto p-5 transition-[transform,visibility] duration-300 ease-out data-[open=true]:visible data-[open=true]:translate-x-0 lg:hidden">
  <button id="cerrar-menu" type="button" aria-label="Cerrar menú"
    class="grid h-12 w-12 place-items-center rounded-xl text-tinta">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
  </button>
  <nav aria-label="Principal (móvil)">
    <div class="zona-oscura mx-auto mt-2 w-11/12 max-w-[20rem] rounded-xl border-2 border-borde bg-talavera p-4 shadow-dura">
      <img src="img/logo-comcom-tilted.svg" alt="Comedor Comunitario" class="mx-auto block h-auto w-full">
    </div>
    <ul class="mt-6 space-y-3">
      ${PAGINAS.map((p, i) => `<li class="-translate-x-6 opacity-0 transition duration-300 group-data-[open=true]:translate-x-0 group-data-[open=true]:opacity-100 motion-reduce:transition-none" style="transition-delay:${100 + i * 60}ms">${enlace(p, true)}</li>`).join("")}
    </ul>
  </nav>
  <div class="mt-auto pt-8 text-center">
    <img src="img/mov-estudiantil-tinta.svg" alt="Sello del Movimiento Estudiantil CUCEI" class="mx-auto h-28 w-28 object-contain sm:h-32 sm:w-32 dark:invert">
    <p class="cita mt-3">« ${cita.texto} »</p>
  </div>
</aside>`;

const icono = (d) =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="inline-block shrink-0">${d}</svg>`;
const PIN = icono('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>');
const RELOJ = icono('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
const ARROBA = icono('<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>');
const SOBRE = icono('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>');

// Objetivos de Desarrollo Sostenible del proyecto, con su color oficial
const ODS = [
  { n: 2,  texto: "Hambre cero",                              color: "#DDA63A" },
  { n: 12, texto: "Producción y consumo responsables",        color: "#BF8B2E" },
  { n: 17, texto: "Alianzas para lograr los objetivos",       color: "#19486A" },
];

const FOOTER = `
<footer class="zona-oscura azulejos mt-auto border-t-2 border-borde px-3 py-10 text-crema sm:px-6 sm:py-14">
  <!-- El texto va en un panel sólido: los azulejos nunca quedan detrás del texto -->
  <div class="mx-auto grid max-w-6xl gap-10 rounded-xl border-2 border-crema bg-noche px-5 py-8 text-base shadow-[6px_6px_0_#0E1A33] sm:px-8 md:grid-cols-[1.2fr_1fr]">
    <div class="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
      <img src="img/mov-estudiantil-kraft.svg" alt="Sello del Movimiento Estudiantil CUCEI" class="h-32 w-32 shrink-0 object-contain">
      <div>
        <p class="flex items-center justify-center gap-2 font-titulo text-2xl sm:justify-start">Comedor Comunitario CUCEI <span class="firma-a text-lg" aria-hidden="true">A</span></p>
        <p class="mt-1">Organizado por el Movimiento Estudiantil CUCEI.</p>
        <ul class="mt-3 space-y-1 font-bold">
          <li class="flex items-center justify-center gap-2 sm:justify-start">${RELOJ}<span>Martes, 1:00 a 6:00 p.m.</span></li>
          <li class="flex items-center justify-center gap-2 sm:justify-start">${PIN}<span>Edificio "Y" (frente al Chedraui)</span></li>
        </ul>
        <figure class="mt-4">
          <blockquote class="cita text-acento">« ${cita.texto} »</blockquote>
          ${cita.autor ? `<figcaption class="mt-1 text-sm font-bold text-crema/80">— ${cita.autor}</figcaption>` : ""}
        </figure>
      </div>
    </div>
    <div class="space-y-2 text-center md:text-right">
      <p class="flex items-center justify-center gap-2 md:justify-end">${ARROBA}<a class="font-bold underline decoration-2 underline-offset-4 hover:text-acento" href="https://www.instagram.com/movimientoestudiantil_cucei/">@movimientoestudiantil_cucei</a></p>
      <p class="flex items-center justify-center gap-2 md:justify-end">${SOBRE}<a class="break-all underline decoration-2 underline-offset-4 hover:text-acento" href="mailto:cucei.comedorcomunitario@gmail.com">cucei.comedorcomunitario@gmail.com</a></p>
      <p><a class="underline decoration-2 underline-offset-4 hover:text-acento" href="privacidad.html">Aviso de privacidad</a></p>
      <ul class="flex flex-wrap justify-center gap-2 pt-3 md:justify-end" aria-label="Objetivos de Desarrollo Sostenible">
        ${ODS.map((o) => `<li class="inline-flex items-center gap-2 rounded-xl border-2 border-crema px-3 py-1 text-left text-sm font-extrabold"><span class="h-3 w-3 shrink-0 rounded-full border border-crema" style="background:${o.color}" aria-hidden="true"></span>ODS ${o.n} · ${o.texto}</li>`).join("")}
      </ul>
      <p class="text-sm text-crema/80">Proyecto de Ingeniería y Sustentabilidad, CUCEI, 2026B.</p>
    </div>
  </div>
</footer>`;

document.getElementById("encabezado").outerHTML = HEADER;
document.getElementById("pie").outerHTML = FOOTER;

// ---------- Comportamiento del menú móvil ----------
const btn = document.getElementById("btn-menu");
const panel = document.getElementById("menu-movil");
const capa = document.getElementById("capa");

function alternar(abrir, enfocar = true) {
  panel.dataset.open = capa.dataset.open = String(abrir);
  panel.inert = !abrir;
  btn.setAttribute("aria-expanded", String(abrir));
  document.body.classList.toggle("overflow-hidden", abrir);
  if (enfocar) (abrir ? panel.querySelector("#cerrar-menu") : btn).focus();
}
btn.addEventListener("click", () => alternar(true));
document.getElementById("cerrar-menu").addEventListener("click", () => alternar(false));
capa.addEventListener("click", () => alternar(false));
document.addEventListener("keydown", (e) => e.key === "Escape" && panel.dataset.open === "true" && alternar(false));
// Si giran el celular o ensanchan la ventana con el menú abierto
matchMedia("(min-width:1024px)").addEventListener("change", (e) => e.matches && alternar(false, false));
document.addEventListener("touchstart", () => {}, { passive: true });