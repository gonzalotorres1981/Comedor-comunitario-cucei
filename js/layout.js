// js/layout.js — Header y footer compartidos por todas las páginas públicas
const PAGINAS = [
  { href: "index.html",        texto: "Inicio",       color: "#FFC93C" },
  { href: "menu.html",         texto: "Menú",         color: "#F2A7C9" },
  { href: "donaciones.html",   texto: "Donaciones",   color: "#9DC4EC" },
  { href: "voluntariado.html", texto: "Voluntariado", color: "#8CC9AF" },
  { href: "impacto.html",      texto: "Impacto",      color: "#B9A5E6" },
  { href: "galeria.html",      texto: "Galería",      color: "#F6BE96" },
];

// Funciona con "menu.html" y con "/menu" (Netlify)
const quitarExt = (s) => s.replace(".html", "");
const actual = quitarExt(location.pathname.split("/").pop() || "index");

const enlace = (p, movil) => {
  const base = movil
        ? "block rounded-2xl border-[2px] border-tinta bg-[var(--c)] px-5 py-3 text-center text-xl font-extrabold italic text-tinta shadow-[4px_4px_0_#3D2D28] transition duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#3D2D28] active:translate-x-[4px] active:translate-y-[4px] motion-reduce:transition-none aria-[current=page]:border-dashed aria-[current=page]:-rotate-2 aria-[current=page]:before:content-['☆'] aria-[current=page]:before:mr-2"
        : "block rounded-2xl border-[1px] border-papel px-1 py-2 text-center font-extrabold italic text-papel transition-colors duration-200 hover:border-tinta hover:bg-[var(--c)] hover:text-tinta focus-visible:border-tinta focus-visible:bg-[var(--c)] focus-visible:text-tinta aria-[current=page]:border-[var(--c)] aria-[current=page]:bg-[var(--c)] aria-[current=page]:text-tinta";
    const activa = quitarExt(p.href) === actual ? 'aria-current="page"' : "";
  return `<a href="${p.href}" ${activa} style="--c:${p.color}" class="${base} focus:outline-none focus-visible:ring-4 focus-visible:ring-azul">${p.texto}</a>`;
};

const HEADER = `
<header class="sticky top-0 z-30 bg-tinta text-papel lg:static">
  <div class="mx-auto max-w-6xl px-4 py-3">
    <div class="grid grid-cols-[3rem_1fr_3rem] items-center lg:grid-cols-1">
      <button id="btn-menu" type="button" aria-expanded="false" aria-controls="menu-movil" aria-label="Abrir menú"
        class="grid h-12 w-12 place-items-center rounded-xl lg:hidden focus:outline-none focus-visible:ring-4 focus-visible:ring-azul">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <a href="index.html" class="justify-self-center rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-azul">
        <img src="img/logo-comcom.svg" alt="Comedor Comunitario" class="h-28 w-auto sm:h-28 lg:h-40 transition-all duration-300 ease-out 
                hover:-translate-y-1">
      </a>
    </div>
    <nav aria-label="Principal" class="mt-5 hidden pb-2 lg:block">
      <ul class="grid grid-cols-6 gap-3">${PAGINAS.map((p) => `<li>${enlace(p, false)}</li>`).join("")}</ul>
    </nav>
  </div>
</header>

<!-- Menú móvil -->
<div id="capa" class="fixed inset-0 z-40 bg-black/50 opacity-0 pointer-events-none transition-opacity duration-300 data-[open=true]:opacity-100 data-[open=true]:pointer-events-auto lg:hidden"></div>
<aside id="menu-movil" inert aria-label="Menú de navegación"
  class="group textura-papel scroll-papel overscroll-contain flex flex-col invisible fixed inset-y-0 left-0 z-50 w-[88%] max-w-sm -translate-x-full overflow-y-auto p-5 transition-[transform,visibility] duration-300 ease-out data-[open=true]:visible data-[open=true]:translate-x-0 lg:hidden">
  <button id="cerrar-menu" type="button" aria-label="Cerrar menú"
    class="grid h-12 w-12 place-items-center rounded-xl text-tinta focus:outline-none focus-visible:ring-4 focus-visible:ring-azul">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
  </button>
  <nav aria-label="Principal (móvil)">
    <ul class="mt-2 space-y-3">
     <img src="img/logo-comcom-tilted.svg" alt="Comedor Comunitario"  class="mx-auto mt-2 block h-auto w-11/12 max-w-[20rem] transition-all duration-300 ease-out  hover:-translate-y-1">
      ${PAGINAS.map((p, i) => `<li class="-translate-x-6 opacity-0 transition duration-300 group-data-[open=true]:translate-x-0 group-data-[open=true]:opacity-100" style="transition-delay:${100 + i * 60}ms">${enlace(p, true)}</li>`).join("")}
    </ul>
  </nav>
  <div class="mt-auto pt-8 text-center text-tinta">
    <img src="img/mov-estudiantil-tinta.svg" alt="Sello del Movimiento Estudiantil CUCEI" class="mx-auto h-28 w-28 object-contain sm:h-32 sm:w-32">
    <p class="mt-3 italic font-bold">« La comida es un derecho, no un negocio »</p>
  </div>
</aside>`;

const FOOTER = `
<footer class="mt-auto bg-tinta text-papel">
  <div class="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 text-center text-sm sm:text-base md:text-left md:grid-cols-2 md:text-left lg:grid-cols-2">
    <div class="flex flex-col items-center gap-4 sm:flex-row">
      <div class="flex gap-4">
        <img src="img/mov-estudiantil-kraft.svg" alt="Sello del Movimiento Estudiantil CUCEI" class="mx-auto h-34 w-32 object-contain sm:h-32 sm:w-32">
        <div>
        <p class="font-titulo text-xl sm:text-2xl">Comedor Comunitario CUCEI</p>
        <p class="mt-1">Organizado por el Movimiento Estudiantil CUCEI.</p>
        <p>Punto de acopio: Edificio "Y" (Chedraui).</p>
        <p class="italic pt-2 text-sm opacity-80 sm:text-sm">« La comida es un derecho, no un negocio »</p></div>
        
      </div>
    </div>
    <div class="space-y-1 md:text-right">
      <p>Contacto: <a class="break-all underline inline-block text-papel transform transition-all duration-300 ease-out hover:text-amarillo hover:translate-x-1" href="mailto:cucei.comedorcomunitario@gmail.com">cucei.comedorcomunitario@gmail.com</a></p>
      <p>Instagram: <a class="inline-block text-papel transform transition-all duration-300 ease-out hover:text-lila hover:translate-x-1" href="https://www.instagram.com/movimientoestudiantil_cucei/"> @movimientoestudiantil_cucei</a></p>
      <p><a class="underline inline-block text-papel transform transition-all duration-300 ease-out hover:text-verde hover:translate-x-1" href="privacidad.html">Aviso de privacidad</a></p>
      <p class="pt-2 text-sm opacity-80 sm:text-sm">Proyecto de Ingeniería y Sustentabilidad, CUCEI, 2026B.</p>
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