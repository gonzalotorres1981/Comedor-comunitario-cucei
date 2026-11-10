// =====================================================================
//  js/admin-invitaciones.js — Pestaña "Invitaciones" del panel (admin.html)
//
//  Qué hace: toma un JPG, PNG o WebP, lo convierte a WebP en el propio
//  navegador, lo comprime para que pese menos que el límite del bucket
//  y lo sube a Supabase Storage con el nombre AAAA-MM-DD.webp (el martes
//  que se elija). También lista las invitaciones publicadas y permite
//  eliminarlas.
//
//  Se carga DESPUÉS de js/admin.js: usa $, esc, mensaje, fechaCorta y el
//  objeto `cargadores`. Todos sus nombres empiezan con inv / INV_ para no
//  chocar con los de admin.js.
//  
// =====================================================================
 
const INV_BUCKET = "invitaciones";
const INV_LIMITE_BUCKET = 2 * 1024 * 1024; // tope que tiene el bucket (2 MB). Si Luz lo cambia, cambiar aquí.
const INV_PESO_MAX = Math.round(INV_LIMITE_BUCKET * 0.9); // "poco menos del tope": ~1.8 MB (es un techo, no una meta)
const INV_LADO_MAX = 2000; // px del lado más largo; más no se nota y solo pesa
const INV_SEMANAS_ATRAS = 2; // cuántos martes pasados se pueden elegir
const INV_SEMANAS_ADELANTE = 2; // y cuántos futuros
const INV_EXT = /\.(webp|jpe?g|png|avif)$/i;
const INV_VACIO = `<p class="inv-vacio">La vista previa aparecerá aquí.</p>`;
 
let invResultado = null; // { blob, tipo, ext, ancho, alto, original, url }
let invExistentes = []; // archivos que ya están en el bucket
 
// ---------- utilidades ----------
const invPeso = (b) =>
  b >= 1048576
    ? (b / 1048576).toFixed(1) + " MB"
    : Math.max(1, Math.round(b / 1024)) + " KB";
 
// Fecha local como AAAA-MM-DD (toISOString la correría al día siguiente en la noche)
const invISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
 
const invFechaLarga = (f) => {
  const t = new Date(f + "T12:00").toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
 
// El ?v= evita que el navegador muestre la versión anterior si se reemplaza una invitación
const invUrl = (f) =>
  sb.storage.from(INV_BUCKET).getPublicUrl(f.name).data.publicUrl +
  "?v=" +
  encodeURIComponent(f.updated_at || "");
 
const invBlob = (lienzo, tipo, calidad) =>
  new Promise((listo) => lienzo.toBlob(listo, tipo, calidad));
 
const invTextoError = (e) => {
  const m = String(e?.message || e);
  if (/bucket not found/i.test(m))
    return 'Todavía no existe el bucket "invitaciones"';
  if (/row-level security|policy|permission|not authorized|unauthorized/i.test(m))
    return "Esta cuenta no tiene permiso para modificar las invitaciones. Revisa que sea de administración y que las políticas del bucket estén creadas.";
  return m;
};
 
// ---------- selector de martes ----------
function invPintarMartes() {
  const sel = $("inv-martes");
  const previo = sel.value;
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  const proximo = new Date(hoy);
  proximo.setDate(hoy.getDate() + ((2 - hoy.getDay() + 7) % 7)); // el próximo martes (hoy, si es martes)
 
  const opciones = [];
  for (let i = INV_SEMANAS_ADELANTE; i >= -INV_SEMANAS_ATRAS; i--) {
    const d = new Date(proximo);
    d.setDate(proximo.getDate() + 7 * i);
    const f = invISO(d);
    const tiene = invExistentes.some((x) => x.name.startsWith(f + "."));
    opciones.push(
      `<option value="${f}">${esc(invFechaLarga(f))}${i === 0 ? " (próximo)" : ""}${tiene ? " ✓" : ""}</option>`,
    );
  }
  sel.innerHTML = opciones.join("");
  sel.value = previo || invISO(proximo);
}
 
// ---------- conversión y compresión ----------
// Algunos navegadores (Safari) no saben guardar WebP desde un lienzo: en ese caso se usa JPG.
let invTipoCache = null;
async function invTipoSalida() {
  if (invTipoCache) return invTipoCache;
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const b = await invBlob(c, "image/webp", 0.8);
  invTipoCache = b && b.type === "image/webp" ? "image/webp" : "image/jpeg";
  return invTipoCache;
}
 
// Busca la mejor calidad que cabe bajo el peso máximo. Casi siempre la primera ya cabe.
async function invMejorCalidad(lienzo, tipo) {
  const alta = await invBlob(lienzo, tipo, 0.92);
  if (alta && alta.size <= INV_PESO_MAX) return alta;
  let bajo = 0.5,
    alto = 0.92,
    mejor = null;
  for (let i = 0; i < 7; i++) {
    const q = (bajo + alto) / 2;
    const b = await invBlob(lienzo, tipo, q);
    if (b && b.size <= INV_PESO_MAX) {
      mejor = b;
      bajo = q;
    } else alto = q;
  }
  return mejor;
}
 
async function invConvertir(archivo) {
  const tipo = await invTipoSalida();
  const bmp = await createImageBitmap(archivo);
  try {
    const mayor = Math.max(bmp.width, bmp.height);
 
    // Un WebP que ya cumple se sube tal cual, sin recomprimirlo
    if (archivo.type === "image/webp" && archivo.size <= INV_PESO_MAX && mayor <= INV_LADO_MAX)
      return { blob: archivo, tipo: "image/webp", ext: "webp", ancho: bmp.width, alto: bmp.height, original: archivo.size };
 
    let lado = Math.min(INV_LADO_MAX, mayor);
    for (let intento = 0; intento < 6; intento++) {
      const factor = lado / mayor;
      const ancho = Math.max(1, Math.round(bmp.width * factor));
      const alto = Math.max(1, Math.round(bmp.height * factor));
      const lienzo = document.createElement("canvas");
      lienzo.width = ancho;
      lienzo.height = alto;
      const ctx = lienzo.getContext("2d");
      ctx.fillStyle = "#fff"; // lo transparente queda en blanco (y en JPG no sale negro)
      ctx.fillRect(0, 0, ancho, alto);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bmp, 0, 0, ancho, alto);
 
      const blob = await invMejorCalidad(lienzo, tipo);
      if (blob)
        return { blob, tipo, ext: tipo === "image/webp" ? "webp" : "jpg", ancho, alto, original: archivo.size };
      lado = Math.round(lado * 0.85); // si aun así pesa de más, se reduce el tamaño y se reintenta
    }
    throw new Error("La imagen es demasiado pesada para reducirla lo suficiente.");
  } finally {
    bmp.close?.();
  }
}
 
// ---------- vista previa ----------
function invLiberar() {
  if (invResultado?.url) URL.revokeObjectURL(invResultado.url);
  invResultado = null;
}
 
function invLimpiar() {
  invLiberar();
  $("inv-archivo").value = "";
  $("inv-vista").innerHTML = INV_VACIO;
  $("inv-publicar").disabled = true;
}
 
function invPintarVista() {
  const r = invResultado;
  const ahorro = Math.round((1 - r.blob.size / r.original) * 100);
  $("inv-vista").innerHTML = `
    <figure class="inv-previa">
      <img src="${r.url}" alt="Vista previa de la invitación optimizada">
      <figcaption>
        <strong>${esc(invPeso(r.blob.size))} · ${r.ext.toUpperCase()}</strong>
        <span>${r.ancho} × ${r.alto} px</span>
        <span>Original: ${esc(invPeso(r.original))}${ahorro > 0 ? ` <span class="inv-ahorro">(${ahorro} % más ligera)</span>` : ""}</span>
        ${r.ext === "jpg" ? `<span class="chip">Este navegador no guarda WebP: se subirá como JPG</span>` : ""}
      </figcaption>
    </figure>`;
}
 
async function invElegir(archivo) {
  if (!archivo) return;
  mensaje("msg-inv", "", "");
  if (!/^image\/(png|jpe?g|webp)$/.test(archivo.type))
    return mensaje("msg-inv", "Elige una imagen JPG, PNG o WebP.", "err");
 
  invLiberar();
  $("inv-publicar").disabled = true;
  $("inv-vista").innerHTML = `<div class="inv-estado"><span class="inv-spinner" aria-hidden="true"></span>Optimizando la imagen…</div>`;
  try {
    invResultado = await invConvertir(archivo);
    invResultado.url = URL.createObjectURL(invResultado.blob);
    invPintarVista();
    $("inv-publicar").disabled = false;
  } catch (e) {
    $("inv-vista").innerHTML = INV_VACIO;
    mensaje("msg-inv", "No se pudo preparar la imagen: " + e.message, "err");
  }
}
 
// ---------- publicar ----------
async function invPublicar() {
  if (!invResultado) return;
  const fecha = $("inv-martes").value;
  const nombre = `${fecha}.${invResultado.ext}`;
  // Archivos de ese mismo martes (sin tocar variantes como 2026-10-13-b.webp)
  const mismoDia = new RegExp("^" + fecha + "\\.(webp|jpe?g|png|avif)$", "i");
  const previos = invExistentes.filter((f) => mismoDia.test(f.name));
 
  if (previos.length && !confirm(`Ya hay una invitación para el ${invFechaLarga(fecha)}. ¿Quieres reemplazarla?`))
    return;
 
  const btn = $("inv-publicar");
  btn.disabled = true;
  btn.textContent = "Publicando…";
  const { error } = await sb.storage.from(INV_BUCKET).upload(nombre, invResultado.blob, {
    contentType: invResultado.tipo,
    upsert: true,
    cacheControl: "3600",
  });
  btn.textContent = "Publicar invitación";
 
  if (error) {
    btn.disabled = false;
    return mensaje("msg-inv", "No se publicó: " + invTextoError(error), "err");
  }
 
  // Si la anterior tenía otra extensión (por ejemplo .jpg), se borra para no dejar dos del mismo martes
  const sobran = previos.map((f) => f.name).filter((n) => n !== nombre);
  if (sobran.length) await sb.storage.from(INV_BUCKET).remove(sobran);
 
  mensaje("msg-inv", `Invitación publicada: ${invFechaLarga(fecha)}.`, "ok");
  invLimpiar();
  invCargarLista();
}
 
// ---------- lista de publicadas ----------
function invPintarLista() {
  const caja = $("inv-lista");
  if (!invExistentes.length) {
    caja.innerHTML = `<p class="vacio">Todavía no hay invitaciones. Sube la primera con el formulario de arriba.</p>`;
    return;
  }
  caja.innerHTML = invExistentes
    .map((f) => {
      const m = f.name.match(/^(\d{4}-\d{2}-\d{2})/);
      const titulo = m ? fechaCorta(m[1]) : f.name;
      const url = invUrl(f);
      const peso = f.metadata?.size ? `<span class="chip">${esc(invPeso(f.metadata.size))}</span>` : "";
      return `
      <article class="inv-card">
        <a href="${esc(url)}" target="_blank" rel="noopener" aria-label="Ver en grande la invitación del ${esc(titulo)}">
          <img src="${esc(url)}" alt="Invitación del ${esc(titulo)}" loading="lazy">
        </a>
        <div class="inv-card-info"><strong>${esc(titulo)}</strong>${peso}</div>
        <button type="button" class="btn sec" data-borrar="${esc(f.name)}">Eliminar</button>
      </article>`;
    })
    .join("");
}
 
async function invCargarLista() {
  const { data, error } = await sb.storage.from(INV_BUCKET).list("", { limit: 500 });
  if (error) {
    $("inv-lista").innerHTML = `<p class="vacio">${esc(invTextoError(error))}</p>`;
    invPintarMartes();
    return;
  }
  invExistentes = data
    .filter((f) => INV_EXT.test(f.name))
    .sort((a, b) => b.name.localeCompare(a.name)); // la fecha va en el nombre: más reciente primero
  invPintarLista();
  invPintarMartes();
}
 
async function invEliminar(nombre, boton) {
  if (!confirm(`¿Eliminar la invitación ${nombre}? Dejará de verse en el sitio.`)) return;
  boton.disabled = true;
  const { data, error } = await sb.storage.from(INV_BUCKET).remove([nombre]);
  boton.disabled = false;
  // Si las políticas no permiten borrar, Supabase no da error: solo devuelve una lista vacía
  if (error || !data || !data.length)
    return mensaje(
      "msg-inv-lista",
      "No se eliminó" + (error ? ": " + invTextoError(error) : ". Revisa que la cuenta tenga permiso de administración."),
      "err",
    );
  mensaje("msg-inv-lista", "Invitación eliminada.", "ok");
  invCargarLista();
}
 
// ---------- conexión con la página ----------
const invZona = $("inv-drop");
$("inv-archivo").addEventListener("change", (e) => invElegir(e.target.files[0]));
["dragenter", "dragover"].forEach((t) =>
  invZona.addEventListener(t, (e) => {
    e.preventDefault();
    invZona.classList.add("arrastrando");
  }),
);
["dragleave", "drop"].forEach((t) =>
  invZona.addEventListener(t, (e) => {
    e.preventDefault();
    invZona.classList.remove("arrastrando");
  }),
);
invZona.addEventListener("drop", (e) => invElegir(e.dataTransfer.files[0]));
 
$("inv-publicar").addEventListener("click", invPublicar);
$("inv-lista").addEventListener("click", (e) => {
  const b = e.target.closest("[data-borrar]");
  if (b) invEliminar(b.dataset.borrar, b);
});
 
// admin.js llama a este cargador al abrir la pestaña
cargadores.invitaciones = invCargarLista;