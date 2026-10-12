// =====================================================================
//  js/donaciones.js — Formulario de donaciones (donaciones.html)
//  Responsable: Persona 4 (formularios)
//
//  Privacidad: NO se pide nombre ni correo. Se guarda solo:
//  tipo, cantidad, descripcion (opcional) y acepto_privacidad.
//  No se manda `recibida`: la marca el comedor desde el panel.
//
//  Se inserta SIN .select(): el público no tiene permiso de lectura.
//  Se puede donar varias veces (no hay límite por persona).
//
//  Script clásico. La conexión `sb` viene de js/supabase.js.
//  Si donaciones.html tiene <div id="donacion"></div> el formulario va
//  ahí; si no, se agrega al final de <main>.
// =====================================================================

const CORREO_COMEDOR_D = "cucei.comedorcomunitario@gmail.com";
const INSTAGRAM_D = "@movimientoestudiantil_cucei";
const PUNTO_ACOPIO = 'Edificio "Y" (Chedraui)';

// Qué se puede donar y cómo se mide la cantidad (coincide con la base de datos)
const TIPOS_DONACION = {
  agua: {
    nombre: "Agua",
    unidad: "garrafones de 20 L",
    etiqueta: "¿Cuántos garrafones de 20 L?",
    paso: "1",
    minimo: 1,
    color: "#9DC4EC",
    nota: `Entrega los garrafones en el punto de acopio: ${PUNTO_ACOPIO}.`,
  },
  despensa: {
    nombre: "Despensa",
    unidad: "artículos o paquetes",
    etiqueta: "¿Cuántos artículos o paquetes?",
    paso: "1",
    minimo: 1,
    color: "#8CC9AF",
    nota: `Entrega tu despensa en el punto de acopio: ${PUNTO_ACOPIO}.`,
  },
  dinero: {
    nombre: "Dinero",
    unidad: "pesos",
    etiqueta: "¿Cuántos pesos te comprometes a donar?",
    paso: "1",
    minimo: 1,
    color: "#F4DE80",
    nota: `Esta página no cobra nada: solo registra tu compromiso. Escríbele al comedor a ${CORREO_COMEDOR_D} o por Instagram (${INSTAGRAM_D}) para acordar la entrega.`,
  },
};

// ---------- utilidades ----------
const escD = (t) =>
  String(t ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

// ---------- estilos compartidos (Tailwind) ----------
const TARJETA_D =
  "rounded-3xl border-[3px] border-[#3D2D28] shadow-[6px_6px_0_#3D2D28] p-6 sm:p-8";
const TITULO_D = "font-['Lilita_One'] text-[#3D2D28] leading-tight";
const CAMPO_D =
  "w-full rounded-xl border-2 border-[#3D2D28] bg-[#FFFCF5] px-3 py-2 text-base focus:outline-none focus:ring-4 focus:ring-[#9DC4EC]";
const BOTON_D =
  "rounded-full border-[3px] border-[#3D2D28] bg-[#43A592] px-6 py-3 font-extrabold text-white shadow-[4px_4px_0_#3D2D28] hover:translate-x-[1px] hover:translate-y-[1px] focus:outline-none focus:ring-4 focus:ring-[#9DC4EC] disabled:opacity-60";

// ---------- contenedor ----------
function obtenerCaja() {
  let caja = document.getElementById("donacion");
  if (!caja) {
    caja = document.createElement("div");
    caja.id = "donacion";
    caja.className = "mx-auto max-w-3xl px-4 py-8";
    (document.querySelector("main") || document.body).appendChild(caja);
  }
  return caja;
}
const cajaDonacion = obtenerCaja();

// ---------- pintado ----------
function formularioDonacion() {
  const radios = Object.entries(TIPOS_DONACION)
    .map(
      ([clave, t], i) => `
      <label class="flex cursor-pointer items-center gap-3 rounded-2xl border-[3px] border-[#3D2D28] px-4 py-3 font-bold has-[:checked]:shadow-[4px_4px_0_#3D2D28] has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#9DC4EC]" style="background:${t.color}">
        <input type="radio" name="d-tipo" value="${clave}" class="h-5 w-5 accent-[#3D2D28]" ${i === 0 ? "" : ""} required>
        <span>${escD(t.nombre)}</span>
      </label>`,
    )
    .join("");

  return `
    <form id="form-donacion" class="${TARJETA_D} bg-[#FDF6E9] space-y-5" novalidate>
      <div>
        <h2 class="${TITULO_D} text-3xl">Haz una donación</h2>
        <p class="text-[#3D2D28] mt-1">No pedimos tu nombre ni tu correo. El comedor marca tu donación como recibida cuando la entregas.</p>
      </div>

      <fieldset>
        <legend class="block font-bold text-[#3D2D28] mb-2">¿Qué quieres donar?</legend>
        <div class="grid gap-3 sm:grid-cols-3">${radios}</div>
      </fieldset>

      <div>
        <label id="d-etiqueta" for="d-cantidad" class="block font-bold text-[#3D2D28] mb-1">Cantidad</label>
        <input id="d-cantidad" type="number" inputmode="numeric" min="1" step="1" class="${CAMPO_D}" placeholder="Elige primero qué quieres donar" disabled required>
      </div>

      <p id="d-nota" class="rounded-2xl border-2 border-dashed border-[#3D2D28] bg-[#FFFCF5] p-4 text-[#3D2D28]" hidden></p>

      <div>
        <label for="d-descripcion" class="block font-bold text-[#3D2D28] mb-1">Detalle (opcional)</label>
        <textarea id="d-descripcion" rows="3" maxlength="300" class="${CAMPO_D}" placeholder="Ej. arroz, frijol y aceite; o cuándo puedes entregarlo"></textarea>
      </div>

      <label class="flex gap-3 items-start text-[#3D2D28]">
        <input id="d-privacidad" type="checkbox" class="mt-1 h-5 w-5 accent-[#43A592]" required>
        <span>Leí y acepto el <a href="privacidad.html" target="_blank" rel="noopener" class="underline font-bold">aviso de privacidad</a> (se abre en otra pestaña).</span>
      </label>

      <button type="submit" class="${BOTON_D}">Registrar mi donación</button>
      <p id="d-msg" class="font-bold text-[#B3261E]" role="alert"></p>
    </form>`;
}

function graciasDonacion(tipo, cantidad) {
  const t = TIPOS_DONACION[tipo];
  return `
    <section class="${TARJETA_D} text-center" style="background:#8CC9AF" aria-live="polite">
      <h2 class="${TITULO_D} text-3xl">¡Gracias por tu donación!</h2>
      <p class="my-4 inline-block rounded-2xl border-[3px] border-dashed border-[#3D2D28] bg-[#FFFCF5] px-6 py-3 font-['Lilita_One'] text-3xl text-[#3D2D28]">${escD(cantidad)} ${escD(t.unidad)}</p>
      <p class="text-[#3D2D28] text-lg max-w-md mx-auto">${escD(t.nota)}</p>
      <button type="button" id="d-otra" class="${BOTON_D} mt-6">Registrar otra donación</button>
    </section>`;
}

function mostrarFormulario() {
  cajaDonacion.innerHTML = formularioDonacion();
  activarFormularioDonacion();
}

// ---------- comportamiento ----------
function activarFormularioDonacion() {
  const form = document.getElementById("form-donacion");
  const cantidad = document.getElementById("d-cantidad");
  const etiqueta = document.getElementById("d-etiqueta");
  const nota = document.getElementById("d-nota");
  const descripcion = document.getElementById("d-descripcion");
  const privacidad = document.getElementById("d-privacidad");
  const msg = document.getElementById("d-msg");

  const tipoElegido = () => {
    const r = form.querySelector('input[name="d-tipo"]:checked');
    return r ? r.value : "";
  };

  // Al elegir el tipo se ajustan la pregunta, el paso y la nota
  form.querySelectorAll('input[name="d-tipo"]').forEach((r) =>
    r.addEventListener("change", () => {
      const t = TIPOS_DONACION[r.value];
      etiqueta.textContent = t.etiqueta;
      cantidad.disabled = false;
      cantidad.min = String(t.minimo);
      cantidad.step = t.paso;
      cantidad.placeholder = t.unidad;
      nota.textContent = t.nota;
      nota.hidden = false;
    }),
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";

    const tipo = tipoElegido();
    if (!tipo) return (msg.textContent = "Elige qué quieres donar.");

    const n = Number(cantidad.value);
    if (!cantidad.value || !Number.isFinite(n) || n <= 0)
      return (msg.textContent = "Escribe una cantidad mayor a cero.");
    if (!Number.isInteger(n))
      return (msg.textContent = "Escribe un número entero, sin decimales.");
    if (n > 100000)
      return (msg.textContent = "Esa cantidad es demasiado grande. Revísala.");
    if (!privacidad.checked)
      return (msg.textContent =
        "Para donar necesitas aceptar el aviso de privacidad.");

    const boton = form.querySelector("button[type=submit]");
    boton.disabled = true;
    boton.textContent = "Registrando…";

    const detalle = descripcion.value.trim();

    // Sin .select(): el público no puede leer la tabla
    const { error } = await sb.from("donaciones").insert({
      tipo,
      cantidad: n,
      descripcion: detalle || null,
      acepto_privacidad: true,
    });

    if (!error) {
      cajaDonacion.innerHTML = graciasDonacion(tipo, n);
      document.getElementById("d-otra").addEventListener("click", mostrarFormulario);
      cajaDonacion.querySelector("section").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (error.code === "42501")
      msg.textContent =
        "No se pudo registrar la donación. Recarga la página e inténtalo de nuevo.";
    else if (error.code === "23514")
      msg.textContent = "Revisa los datos: la cantidad debe ser mayor a cero.";
    else
      msg.textContent =
        "No se pudo registrar. Revisa tu conexión e inténtalo de nuevo.";
    boton.disabled = false;
    boton.textContent = "Registrar mi donación";
  });
}

mostrarFormulario();
