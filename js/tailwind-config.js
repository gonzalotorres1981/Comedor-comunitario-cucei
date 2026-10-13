tailwind.config = {
  future: { hoverOnlyWhenSupported: true }, // evita hovers "pegados" en celular
  theme: {
    extend: {
      colors: {
        papel: "#FDF6E9", crema: "#FFFCF5", tinta: "#3D2D28",
        verde: "#43A592", amarillo: "#F4DE80", rosa: "#F2A7C9",
        azul: "#9DC4EC", lila: "#B9A5E6", menta: "#8CC9AF", 
        naranja: "#F6BE96", cinta: "#EADDB8",
      },
      fontFamily: { titulo: ['"Lilita One"'], cuerpo: ["Nunito"] },
      boxShadow: { sticker: "6px 6px 0 #3D2D28" },
    },
  },
};