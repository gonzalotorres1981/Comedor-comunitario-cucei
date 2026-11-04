// =====================================================================
// js/impacto.js — Dashboard de impacto (impacto.html)
// Responsable: Persona 5 (impacto y correos)
//
// Qué hace:
// - Pide los datos agregados a Supabase y dibuja las gráficas con Chart.js.
//   (Chart.js se carga por CDN en impacto.html antes de este archivo).
// - Muestra el impacto del comedor relacionado con los ODS 2, 12 y 17.
//
// Funciones de la base de datos para las gráficas:
// - sb.rpc('resumen_semanal')            → platos preparados/servidos por semana
// - sb.rpc('litros_de_agua')             → litros de agua donados
// - sb.rpc('beneficiados_por_carrera')   → beneficiados por carrera
// - sb.rpc('beneficiados_por_semestre')  → beneficiados por semestre
// - sb.rpc('horas_voluntariado')         → horas de voluntariado
//
// - La predicción de demanda NO usa una función nueva: se calcula en el navegador
//   con los platos servidos que ya devuelve sb.rpc('resumen_semanal').
//
// `sb` ya existe: viene de js/supabase.js.
//
// Mensajes: al público solo se le muestran los textos de MENSAJES.
// Los detalles técnicos van ÚNICAMENTE a la consola (console.error/warn).
// =====================================================================

// ---------- Mensajes públicos (únicos textos de estado que ve el visitante) ----------
const MENSAJES = {
  cargando: 'Cargando datos…',
  vacio: 'No hay datos disponibles por el momento.',
  pocosDatos: 'Aún no hay suficientes registros para estimar la demanda.',
  errorDatos: 'No se pudieron cargar los datos.',
  errorGrafica: 'No se pudo cargar esta gráfica.'
};

// ---------- Utilidades ----------
const FORMATO_NUMERO = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });
const FORMATO_DOS_DECIMALES = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });

// Cuántos martes se muestran en las gráficas por fecha (resumen y predicción).
// Los datos anteriores siguen en la base de datos; solo no se dibujan.
const MAX_MARTES_MOSTRADOS = 5;

// Registro técnico: solo consola, nunca la interfaz.
function registrarError(contexto, error) {
  console.error(`[impacto] ${contexto}:`, error);
}

function numeroONulo(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor); // numeric de Postgres puede llegar como texto
  return Number.isFinite(numero) ? numero : null;
}

function fechaLegible(fechaISO, conAnio = true) {
  // Parsear YYYY-MM-DD como fecha local evita que la zona horaria cambie el día.
  const partes = String(fechaISO).split('-').map(Number);
  if (partes.length < 3 || partes.some(Number.isNaN)) return null;
  const [anio, mes, dia] = partes;
  const opciones = conAnio
    ? { day: '2-digit', month: 'short', year: 'numeric' }
    : { day: '2-digit', month: 'short' };
  return new Intl.DateTimeFormat('es-MX', opciones).format(new Date(anio, mes - 1, dia));
}

function recortar(texto, max) {
  const t = String(texto);
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}

// Colores del tema actual (el proyecto cambia variables CSS en modo oscuro).
function colorTexto() {
  const valor = getComputedStyle(document.documentElement).getPropertyValue('--c-texto').trim();
  return valor || '#2B1D22';
}

const COLOR_REJILLA = 'rgba(128, 128, 128, 0.25)';
const PALETA = {
  azul: '#3B6BC4',
  rosa: '#C2418A',
  verde: '#3E9B5A',
  amarillo: '#E0A800'
};

// Aplica los colores del tema actual (claro/oscuro) a Chart.js y a las gráficas ya dibujadas.
function aplicarColoresTema() {
  const texto = colorTexto();
  Chart.defaults.color = texto;
  Object.values(Chart.instances).forEach(grafica => {
    const { scales, plugins } = grafica.options;
    Object.values(scales || {}).forEach(eje => {
      if (eje.ticks) eje.ticks.color = texto;
      if (eje.title) eje.title.color = texto;
    });
    if (plugins && plugins.legend && plugins.legend.labels) plugins.legend.labels.color = texto;
    grafica.update('none');
  });
}

// Si la persona cambia entre modo claro y oscuro con la página abierta, se actualizan los colores.
if (window.matchMedia) {
  const esquemaOscuro = window.matchMedia('(prefers-color-scheme: dark)');
  if (esquemaOscuro.addEventListener) esquemaOscuro.addEventListener('change', () => {
    if (typeof Chart !== 'undefined') aplicarColoresTema();
  });
}

// Una misma RPC se pide una sola vez por carga, aunque la usen varias gráficas
// (resumen_semanal alimenta la gráfica de comidas y la de predicción).
const consultasEnCurso = new Map();
function consultarRpc(nombre) {
  if (!consultasEnCurso.has(nombre)) {
    consultasEnCurso.set(nombre, Promise.resolve(sb.rpc(nombre)));
  }
  return consultasEnCurso.get(nombre);
}

function mostrarNota(id, texto) {
  const elemento = document.getElementById(id);
  if (!elemento) return;
  elemento.textContent = texto;
  elemento.classList.remove('hidden');
}

function escribirTexto(id, texto) {
  const elemento = document.getElementById(id);
  if (elemento) elemento.textContent = texto;
}

// ---------- Estado de cada tarjeta ----------
function mostrarEstado(id, mensaje, tipo = 'normal') {
  const elemento = document.getElementById(`estado-${id}`);
  if (!elemento) return;
  elemento.textContent = mensaje;
  elemento.className = 'text-sm mb-4';
  elemento.classList.add(tipo === 'error' ? 'text-error' : 'text-tinta-2');
}

function mostrarContenedor(id, visible) {
  const contenedor = document.getElementById(`contenedor-${id}`);
  if (contenedor) contenedor.classList.toggle('hidden', !visible);
}

// Destruye la gráfica anterior del canvas (evita duplicados si se inicializa dos veces).
function destruirGrafica(canvas) {
  const anterior = Chart.getChart(canvas);
  if (anterior) anterior.destroy();
}

// Opciones comunes a todas las gráficas.
function opcionesBase({ tituloX, tituloY, horizontal = false, leyenda = false }) {
  const texto = colorTexto();
  const ejeCategorias = {
    title: { display: !!(horizontal ? tituloY : tituloX), text: horizontal ? tituloY : tituloX, color: texto },
    ticks: { color: texto, autoSkip: true, maxRotation: 45, minRotation: 0 },
    grid: { display: false }
  };
  const ejeValores = {
    beginAtZero: true,
    title: { display: true, text: horizontal ? tituloX : tituloY, color: texto },
    ticks: { color: texto, precision: 0 },
    grid: { color: COLOR_REJILLA }
  };
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      legend: { display: leyenda, position: 'bottom', labels: { color: texto } }
    },
    scales: horizontal
      ? { x: ejeValores, y: ejeCategorias }
      : { x: ejeCategorias, y: ejeValores }
  };
}

// ---------- Gráfica 1: resumen_semanal ----------
// Columnas (según el SQL del proyecto): fecha, es_linea_base, reservas,
// platos_preparados, platos_servidos, platos_sobrantes.
function dibujarResumen(canvas, datos) {
  const filas = datos
    .filter(f => fechaLegible(f.fecha) !== null)
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
    .slice(-MAX_MARTES_MOSTRADOS); // solo los últimos martes
  if (filas.length === 0) return false;

  const etiquetas = filas.map(f => fechaLegible(f.fecha));

  // Los sobrantes no pueden ser negativos: si los datos dicen lo contrario
  // (servidos > preparados), se muestra 0 y se avisa solo en consola.
  const sobrantes = filas.map(f => {
    const valor = numeroONulo(f.platos_sobrantes);
    if (valor !== null && valor < 0) {
      console.warn(`[impacto] platos_sobrantes negativo (${valor}) en ${f.fecha}: se muestra 0. Revisar platos_preparados y platos_servidos.`);
      return 0;
    }
    return valor;
  });

  const serie = (label, datos, color) => ({
    label,
    data: datos,
    backgroundColor: color,
    borderColor: color,
    borderWidth: 1,
    borderRadius: 4,
    maxBarThickness: 42
  });

  const opciones = opcionesBase({
    tituloX: 'Fecha del comedor',
    tituloY: 'Reservas / platos',
    leyenda: true
  });
  opciones.interaction = { mode: 'index', intersect: false };
  opciones.plugins.tooltip = {
    callbacks: {
      label: ctx => ctx.parsed.y === null
        ? `${ctx.dataset.label}: sin registro`
        : `${ctx.dataset.label}: ${FORMATO_NUMERO.format(ctx.parsed.y)}`
    }
  };

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: [
        serie('Reservas', filas.map(f => numeroONulo(f.reservas)), PALETA.azul),
        serie('Platos preparados', filas.map(f => numeroONulo(f.platos_preparados)), PALETA.rosa),
        serie('Platos servidos', filas.map(f => numeroONulo(f.platos_servidos)), PALETA.verde),
        serie('Platos sobrantes', sobrantes, PALETA.amarillo)
      ]
    },
    options: opciones
  });
  mostrarNota('nota-martes-resumen', `Se muestran únicamente los últimos ${MAX_MARTES_MOSTRADOS} martes.`);
  return true;
}

// ---------- Gráfica 2: beneficiados_por_carrera ----------
// Columnas: carrera (text), estudiantes (int). Ya viene ordenado de mayor a menor.
function dibujarCarrera(canvas, datos, contexto) {
  const filas = datos
    .map(f => ({ carrera: String(f.carrera ?? '').trim(), valor: numeroONulo(f.estudiantes) }))
    .filter(f => f.carrera !== '' && f.valor !== null)
    .sort((a, b) => b.valor - a.valor);
  if (filas.length === 0) return false;

  // Altura según el número de carreras, para que las etiquetas no se amontonen.
  const alto = Math.min(640, Math.max(260, filas.length * 30 + 90));
  contexto.contenedor.style.height = `${alto}px`;

  const opciones = opcionesBase({
    tituloX: 'Reservas',
    tituloY: 'Carrera',
    horizontal: true
  });
  // Se oculta el título del eje ("Carrera"): es redundante y se encimaba con los nombres en móviles.
  opciones.scales.y.title.display = false;
  opciones.scales.y.ticks = {
    color: colorTexto(),
    font: { size: 11 },
    autoSkip: false,
    callback(valor) { return recortar(this.getLabelForValue(valor), 28); }
  };
  opciones.plugins.tooltip = {
    callbacks: {
      title: items => items.map(i => filas[i.dataIndex].carrera),
      label: ctx => `${FORMATO_NUMERO.format(ctx.parsed.x)} reservas`
    }
  };

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: filas.map(f => f.carrera),
      datasets: [{
        label: 'Reservas',
        data: filas.map(f => f.valor),
        backgroundColor: PALETA.azul,
        borderRadius: 4,
        maxBarThickness: 22
      }]
    },
    options: opciones
  });
  return true;
}

// ---------- Gráfica 3: beneficiados_por_semestre ----------
// Columnas: semestre (smallint, puede ser nulo), estudiantes (int).
function dibujarSemestre(canvas, datos) {
  const filas = datos
    .map(f => ({ semestre: numeroONulo(f.semestre), valor: numeroONulo(f.estudiantes) }))
    .filter(f => f.valor !== null)
    // Orden lógico: 1, 2, 3… y, al final, quienes no tienen semestre registrado.
    .sort((a, b) => {
      if (a.semestre === null) return 1;
      if (b.semestre === null) return -1;
      return a.semestre - b.semestre;
    });
  if (filas.length === 0) return false;

  const etiqueta = f => f.semestre === null ? 'Sin semestre' : `${f.semestre}.º`;

  const opciones = opcionesBase({
    tituloX: 'Semestre',
    tituloY: 'Reservas'
  });
  opciones.plugins.tooltip = {
    callbacks: {
      title: items => items.map(i => {
        const f = filas[i.dataIndex];
        return f.semestre === null ? 'Sin semestre registrado' : `${f.semestre}.º semestre`;
      }),
      label: ctx => `${FORMATO_NUMERO.format(ctx.parsed.y)} reservas`
    }
  };

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: filas.map(etiqueta),
      datasets: [{
        label: 'Reservas',
        data: filas.map(f => f.valor),
        backgroundColor: PALETA.rosa,
        borderRadius: 4,
        maxBarThickness: 48
      }]
    },
    options: opciones
  });
  return true;
}

// ---------- Gráfica 4: litros_de_agua ----------
// Columnas: semana (date, inicio de semana), litros (numeric). Un registro por semana.
function dibujarAgua(canvas, datos, contexto) {
  const filas = datos
    .map(f => ({ semana: f.semana, litros: numeroONulo(f.litros) }))
    .filter(f => f.litros !== null && fechaLegible(f.semana) !== null)
    .sort((a, b) => String(a.semana).localeCompare(String(b.semana)));
  if (filas.length === 0) return false;

  const opciones = opcionesBase({
    tituloX: 'Semana (fecha de inicio)',
    tituloY: 'Litros de agua'
  });
  opciones.plugins.tooltip = {
    callbacks: {
      title: items => items.map(i => `Semana del ${fechaLegible(filas[i.dataIndex].semana)}`),
      label: ctx => `${FORMATO_NUMERO.format(ctx.parsed.y)} litros`
    }
  };

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: filas.map(f => fechaLegible(f.semana, false)),
      datasets: [{
        label: 'Litros de agua',
        data: filas.map(f => f.litros),
        backgroundColor: PALETA.azul,
        borderRadius: 4,
        maxBarThickness: 48
      }]
    },
    options: opciones
  });

  const total = filas.reduce((suma, f) => suma + f.litros, 0);
  contexto.nota = `Total recibido: ${FORMATO_NUMERO.format(total)} litros.`;
  return true;
}

// ---------- Gráfica 5: horas_voluntariado ----------
// Columnas: fecha (date), horas (numeric). Un registro por fecha; solo asistencias registradas.
function dibujarHoras(canvas, datos, contexto) {
  const filas = datos
    .map(f => ({ fecha: f.fecha, horas: numeroONulo(f.horas) }))
    .filter(f => f.horas !== null && fechaLegible(f.fecha) !== null)
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
  if (filas.length === 0) return false;

  const opciones = opcionesBase({
    tituloX: 'Fecha del turno',
    tituloY: 'Horas de voluntariado'
  });
  opciones.scales.y.ticks.precision = 1;
  opciones.plugins.tooltip = {
    callbacks: {
      title: items => items.map(i => fechaLegible(filas[i.dataIndex].fecha)),
      label: ctx => `${FORMATO_NUMERO.format(ctx.parsed.y)} horas de voluntariado`
    }
  };

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: filas.map(f => fechaLegible(f.fecha, false)),
      datasets: [{
        label: 'Horas de voluntariado',
        data: filas.map(f => f.horas),
        backgroundColor: PALETA.verde,
        borderRadius: 4,
        maxBarThickness: 48
      }]
    },
    options: opciones
  });

  const total = filas.reduce((suma, f) => suma + f.horas, 0);
  contexto.nota = `Total registrado: ${FORMATO_NUMERO.format(total)} horas.`;
  return true;
}

// ---------- Gráfica de predicción de demanda (usa resumen_semanal) ----------
// Predicción = suma de platos servidos en los últimos martes (MAX_MARTES_MOSTRADOS) / número de martes usados.
// Se usan los PLATOS SERVIDOS (no las reservas). Los martes sin platos servidos registrados no cuentan.
const MIN_MARTES_PREDICCION = 2;

function fechaAISO(fecha) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// Primer martes a partir de hoy que todavía no tenga platos servidos registrados.
function proximoMartes(fechasConServidos) {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  while (fecha.getDay() !== 2) fecha.setDate(fecha.getDate() + 1);
  while (fechasConServidos.has(fechaAISO(fecha))) fecha.setDate(fecha.getDate() + 7);
  return fechaAISO(fecha);
}

function dibujarPrediccion(canvas, datos, contexto) {
  const filas = datos
    .map(f => ({ fecha: f.fecha, servidos: numeroONulo(f.platos_servidos) }))
    .filter(f => f.servidos !== null && fechaLegible(f.fecha) !== null)
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
    .slice(-MAX_MARTES_MOSTRADOS); // el promedio usa solo los últimos martes con platos servidos

  if (filas.length < MIN_MARTES_PREDICCION) {
    contexto.mensajeVacio = MENSAJES.pocosDatos;
    return false;
  }

  const promedio = filas.reduce((suma, f) => suma + f.servidos, 0) / filas.length;
  const estimado = Math.round(promedio);
  const fechaProximo = proximoMartes(new Set(filas.map(f => String(f.fecha))));

  const verde = PALETA.verde;
  const opciones = opcionesBase({
    tituloX: 'Martes',
    tituloY: 'Platos',
    leyenda: true
  });
  // Barras apiladas: así cada martes tiene una sola barra centrada
  // (los datos históricos y la predicción nunca coinciden en la misma fecha).
  opciones.scales.x.stacked = true;
  opciones.scales.y.stacked = true;
  opciones.scales.x.ticks = { ...opciones.scales.x.ticks, autoSkip: false, maxRotation: 60 };
  opciones.interaction = { mode: 'index', intersect: false };
  opciones.plugins.tooltip = {
    filter: item => item.parsed.y !== null,
    callbacks: {
      title: items => items.map(i => i.dataIndex < filas.length
        ? fechaLegible(filas[i.dataIndex].fecha)
        : `Próximo martes (${fechaLegible(fechaProximo)})`),
      label: ctx => ctx.datasetIndex === 0
        ? `${FORMATO_NUMERO.format(ctx.parsed.y)} platos servidos`
        : `${FORMATO_NUMERO.format(ctx.parsed.y)} platos estimados (promedio ${FORMATO_DOS_DECIMALES.format(promedio)})`
    }
  };

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: [...filas.map(f => fechaLegible(f.fecha, false)), 'Próximo martes'],
      datasets: [
        {
          label: 'Platos servidos',
          data: [...filas.map(f => f.servidos), null],
          backgroundColor: verde,
          borderColor: verde,
          borderWidth: 1,
          borderRadius: 4,
          maxBarThickness: 48
        },
        {
          // La predicción se distingue por el relleno claro y el borde marcado.
          label: 'Predicción',
          data: [...filas.map(() => null), estimado],
          backgroundColor: 'rgba(62, 155, 90, 0.30)',
          borderColor: verde,
          borderWidth: 2,
          borderRadius: 4,
          maxBarThickness: 48
        }
      ]
    },
    options: opciones
  });

  escribirTexto('prediccion-estimado', FORMATO_NUMERO.format(estimado));
  escribirTexto('prediccion-promedio', FORMATO_DOS_DECIMALES.format(promedio));
  escribirTexto('prediccion-martes', String(filas.length));
  mostrarNota('nota-martes-prediccion', `Solo se toman en cuenta los últimos ${MAX_MARTES_MOSTRADOS} martes con platos servidos registrados.`);
  return true;
}

// ---------- Definición de las gráficas ----------
const GRAFICAS = [
  { id: 'resumen',  rpc: 'resumen_semanal',           dibujar: dibujarResumen },
  { id: 'prediccion', rpc: 'resumen_semanal',         dibujar: dibujarPrediccion },
  { id: 'carrera',  rpc: 'beneficiados_por_carrera',  dibujar: dibujarCarrera },
  { id: 'semestre', rpc: 'beneficiados_por_semestre', dibujar: dibujarSemestre },
  { id: 'agua',     rpc: 'litros_de_agua',            dibujar: dibujarAgua },
  { id: 'horas',    rpc: 'horas_voluntariado',        dibujar: dibujarHoras }
];

// Carga una gráfica de forma independiente: un fallo aquí no afecta a las demás.
async function cargarGrafica(config) {
  const { id, rpc, dibujar } = config;
  const canvas = document.getElementById(`grafica-${id}`);
  const contenedor = document.getElementById(`contenedor-${id}`);

  mostrarContenedor(id, false);
  mostrarEstado(id, MENSAJES.cargando);

  if (!canvas || !contenedor || typeof sb === 'undefined' || typeof Chart === 'undefined') {
    registrarError(`${id}: falta el canvas, el cliente sb o Chart.js`, { canvas: !!canvas, contenedor: !!contenedor, sb: typeof sb, Chart: typeof Chart });
    mostrarEstado(id, MENSAJES.errorGrafica, 'error');
    return;
  }

  // 1) Consulta
  let datos;
  try {
    const respuesta = await consultarRpc(rpc);
    if (respuesta.error) throw respuesta.error;
    datos = respuesta.data;
  } catch (error) {
    registrarError(`falló la consulta rpc("${rpc}")`, error);
    mostrarEstado(id, MENSAJES.errorDatos, 'error');
    return;
  }

  // 2) Sin registros (distinto de un error de consulta)
  if (!Array.isArray(datos) || datos.length === 0) {
    mostrarEstado(id, MENSAJES.vacio);
    return;
  }

  // 3) Dibujo
  try {
    destruirGrafica(canvas);
    const contexto = { contenedor, nota: '' };
    mostrarContenedor(id, true); // visible antes de dibujar para que Chart.js mida bien
    const dibujada = dibujar(canvas, datos, contexto);
    if (!dibujada) {
      console.warn(`[impacto] rpc("${rpc}") devolvió filas, pero ninguna tenía los campos esperados.`, datos);
      mostrarContenedor(id, false);
      mostrarEstado(id, contexto.mensajeVacio || MENSAJES.vacio);
      return;
    }
    mostrarEstado(id, contexto.nota);
    if (!contexto.nota) document.getElementById(`estado-${id}`)?.classList.add('hidden');
  } catch (error) {
    registrarError(`falló el dibujo de la gráfica "${id}"`, error);
    destruirGrafica(canvas);
    mostrarContenedor(id, false);
    mostrarEstado(id, MENSAJES.errorGrafica, 'error');
  }
}

// ---------- Inicio (protegido contra doble ejecución) ----------
let impactoIniciado = false;

async function iniciarImpacto() {
  if (impactoIniciado) return;
  impactoIniciado = true;
  consultasEnCurso.clear();
  if (typeof Chart !== 'undefined') Chart.defaults.color = colorTexto();
  // Se limpia cualquier estado oculto de una carga anterior.
  GRAFICAS.forEach(g => document.getElementById(`estado-${g.id}`)?.classList.remove('hidden'));
  await Promise.allSettled(GRAFICAS.map(cargarGrafica));
}

document.addEventListener('DOMContentLoaded', iniciarImpacto);
