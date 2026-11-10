// =====================================================================
//  js/tendedero.js — Tendedero de fotos en impacto.html
//  Las fotos viven en el bucket público "impacto" de Supabase Storage
//  (igual que las invitaciones). Se cuelgan en orden por nombre de archivo
//  y el tendedero avanza solo mientras la persona está en la página.
// =====================================================================

const BUCKET_TENDEDERO = "impacto";
const EXT_FOTO = /\.(webp|jpe?g|png|avif)$/i;
const COLORES_PRENDA = ["bg-st-rosa", "bg-st-amarillo", "bg-st-azul", "bg-st-bugambilia", "bg-st-verde", "bg-st-salmon", "bg-st-crema"];
const GIROS = [-3, 2, -1.5, 3, -2, 1.5];
const MIN_PRENDAS = 8;          // con pocas fotos se repiten para llenar el mecate
const SEGUNDOS_POR_PRENDA = 5;  // velocidad del desplazamiento

const escT = (t) =>
  String(t ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Pinza de madera (decorativa)
const PINZA = `
<svg class="pinza" viewBox="0 0 20 52" aria-hidden="true" focusable="false">
  <rect x="2" y="1" width="7.5" height="50" rx="3" fill="#E0AA6E" stroke="#5C3A1E" stroke-width="1.5"/>
  <rect x="10.5" y="1" width="7.5" height="50" rx="3" fill="#C98B4E" stroke="#5C3A1E" stroke-width="1.5"/>
  <rect x="0.75" y="18" width="18.5" height="7" rx="2" fill="#AEB6BF" stroke="#4A5058" stroke-width="1.5"/>
</svg>`;

function prenda(foto, i, copia) {
  const color = COLORES_PRENDA[i % COLORES_PRENDA.length];
  const giro = GIROS[i % GIROS.length];
  const retraso = -((i * 0.7) % 4.5).toFixed(2); // cada prenda se mece a su ritmo
  return `
  <li class="prenda" style="--r:${giro}deg;--d:${retraso}s"${copia ? ' data-copia aria-hidden="true"' : ""}>
    ${PINZA}
    <figure class="nota ${color}">
      <img src="${escT(foto.url)}" alt="${copia ? "" : "Foto del Comedor Comunitario CUCEI"}" loading="lazy" decoding="async"
        class="aspect-[4/5] w-full rounded-lg border-2 border-noche object-cover">
    </figure>
  </li>`;
}

async function cargarFotos() {
  const { data, error } = await sb.storage.from(BUCKET_TENDEDERO).list("", {
    limit: 200,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw error;
  return data
    .filter((f) => EXT_FOTO.test(f.name))
    .map((f) => ({ url: sb.storage.from(BUCKET_TENDEDERO).getPublicUrl(f.name).data.publicUrl }));
}

function avisoTendedero(pista, texto) {
  pista.innerHTML = `<li class="tendedero-aviso">${texto}</li>`;
}

(async () => {
  const pista = document.getElementById("tendedero");
  if (!pista) return;
  const marco = pista.closest(".tendedero-marco");
  const boton = document.getElementById("tendedero-pausa");

  let fotos;
  try {
    fotos = await cargarFotos();
  } catch {
    avisoTendedero(pista, "No se pudieron cargar las fotos. Revisa tu conexión y recarga la página.");
    return;
  }
  if (!fotos.length) {
    avisoTendedero(pista, "Muy pronto colgaremos aquí fotos del comedor.");
    return;
  }

  // Se repiten hasta llenar el mecate y luego se duplica todo:
  // la pista avanza la mitad de su ancho y vuelve a empezar sin que se note el salto.
  const vuelta = [];
  while (vuelta.length < MIN_PRENDAS) vuelta.push(...fotos);
  pista.innerHTML =
    vuelta.map((f, i) => prenda(f, i, i >= fotos.length)).join("") +
    vuelta.map((f, i) => prenda(f, i, true)).join("");
  pista.style.setProperty("--duracion", `${vuelta.length * SEGUNDOS_POR_PRENDA}s`);
  marco.classList.add("en-marcha");

  if (boton) {
    boton.parentElement.hidden = false;
    boton.addEventListener("click", () => {
      const pausado = marco.classList.toggle("pausado");
      boton.setAttribute("aria-pressed", String(pausado));
      boton.querySelector("span").textContent = pausado ? "Reanudar" : "Pausar";
    });
  }
})();
