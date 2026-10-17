// Colores, fuentes y sombras del sistema visual. Los valores viven en css/estilos.css
// (variables --c-*), así el modo oscuro funciona sin cambiar las clases.
tailwind.config = {
  future: { hoverOnlyWhenSupported: true }, // evita hovers "pegados" en celular
  theme: {
    extend: {
      colors: {
        // Cambian en modo oscuro
        fondo: "var(--c-fondo)",                  // Papel Crema
        superficie: "var(--c-superficie)",        // Tarjetas
        "superficie-alt": "var(--c-superficie-alt)", // Rosa Papel, secciones alternas
        tinta: "var(--c-texto)",                  // Tinta Vino: texto
        "tinta-2": "var(--c-texto-2)",            // Tinta Suave: metadatos
        borde: "var(--c-borde)",                  // Bordes y sombras duras
        primario: "var(--c-primario)",            // Rojo Comedor: botones y enlaces
        "primario-hover": "var(--c-primario-hover)",
        "sobre-primario": "var(--c-sobre-oscuro)",
        secundario: "var(--c-secundario)",        // Azul Talavera: títulos de sección
        terciario: "var(--c-terciario)",          // Rosa Bugambilia
        exito: "var(--c-exito)",
        alerta: "var(--c-alerta)",
        error: "var(--c-error)",
        // Fijos (iguales en los dos modos)
        firma: "#E8242B",     // Rojo Ⓐ: SOLO decorativo
        talavera: "#1E3A6E",  // Fondo del encabezado y franjas de fecha
        acento: "#F7C744",    // Amarillo Cempasúchil: solo como fondo
        vino: "#7F201F",      // Sombra del sello "Aportación voluntaria"
        noche: "#2B1D22",     // Tinta fija: texto sobre colores claros y pie de página
        crema: "#FFF4E8",     // Texto sobre fondos oscuros
        // Papeles de colores para notas y stickers (siempre con texto `noche`)
        st: {
          amarillo: "#F7C744", rosa: "#FFE4E4", bugambilia: "#F08BC0",
          azul: "#9DB7F2", verde: "#7AAD82", salmon: "#FF7A6B", crema: "#FFF4E8",
        },
      },
      fontFamily: {
        titulo: ['"Permanent Marker"', '"Comic Sans MS"', "cursive"], // solo h1 y h2
        cuerpo: ["Nunito", "system-ui", "sans-serif"],
        cita: ["Caveat", "cursive"],                                  // solo citas
      },
      fontSize: {
        h1: ["clamp(2.25rem, 4vw + 1rem, 3.5rem)", { lineHeight: "1.15" }],
        h2: ["2rem", { lineHeight: "1.15" }],
        h3: ["1.5rem", { lineHeight: "1.3" }],
        cuerpo: ["1.0625rem", { lineHeight: "1.6" }],
      },
      boxShadow: {
        dura: "4px 4px 0 var(--c-borde)",
        "dura-press": "2px 2px 0 var(--c-borde)",
        "dura-lg": "8px 8px 0 var(--c-borde)",
      },
    },
  },
};
