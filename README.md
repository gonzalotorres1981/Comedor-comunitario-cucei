<!-- README.md | Responsable: Persona 1 (coordinación) -->

# Comedor Comunitario

Página web del comedor comunitario de la universidad. Permite **reservar** el platillo del martes, registrar **donaciones** (agua, despensa o dinero), inscribirse a turnos de **voluntariado** y consultar un **dashboard de impacto** con los resultados del comedor.

Proyecto de la materia Ingeniería y Sustentabilidad (CUCEI, UdeG), alineado con los Objetivos de Desarrollo Sostenible:

- **ODS 2:** Hambre cero
- **ODS 12:** Producción y consumo responsables
- **ODS 17:** Alianzas para lograr los objetivos

## Stack

HTML, CSS, JavaScript, Tailwind CSS (CDN), Supabase, Chart.js, Netlify y GitHub.

No usa npm, frameworks ni bundlers: todas las librerías se cargan desde CDN.

## Cómo correrlo

1. Abre la carpeta `comedor/` en VS Code (**File → Open Folder**).
2. Instala la extensión **Live Server** (Ritwick Dey) si no la tienes.
3. Clic derecho en `index.html` → **Open with Live Server**. La página se recarga sola cada vez que guardas.

## Cómo configurar Supabase

1. Crea la base de datos: en Supabase abre **SQL Editor**, pega el contenido de `database/base_de_datos_comedor.sql` y ejecútalo.
2. En **Project Settings → API** copia la *Project URL* y la llave **anon / publishable**.
3. Pégalas en `js/supabase.js`, en `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

> ⚠️ Nunca pongas la llave **secret** ni la **service_role** en `js/supabase.js`: ese archivo se sube a GitHub y lo descarga cualquier visitante.

## Estructura

```
comedor/
├── index.html, menu.html, donaciones.html,
│   voluntariado.html, impacto.html, privacidad.html   ← páginas públicas
├── admin.html          ← panel de administración (requiere iniciar sesión)
├── css/                ← estilos.css (público) y admin.css (panel)
├── js/                 ← supabase.js (conexión) y un script por página
├── img/                ← imágenes del sitio
└── database/           ← script SQL de la base de datos
```

## Forma de trabajo

1. Antes de empezar, actualiza `main`: `git checkout main` y `git pull`.
2. Crea tu propia rama con tu número y tu tarea, por ejemplo: `git checkout -b persona3-admin`.
3. Modifica **solo tus archivos** (ver tabla de abajo). Así evitamos conflictos.
4. Haz commits pequeños con mensajes claros y sube tu rama: `git push -u origin persona3-admin`.
5. En GitHub abre un **pull request** hacia `main` y avisa al equipo para que lo revisen.

## Responsables

| Persona | Rol | Archivos |
| --- | --- | --- |
| Persona 1 | Coordinación | `README.md` |
| Persona 2 | Diseño | Los 6 `.html` públicos, `css/estilos.css`, `img/` |
| Persona 3 | Base de datos | `admin.html`, `css/admin.css`, `js/admin.js`, `js/supabase.js`, `database/` |
| Persona 4 | Formularios | `js/reservas.js`, `js/donaciones.js`, `js/voluntariado.js` |
| Persona 5 | Impacto y correos | `js/impacto.js` |
