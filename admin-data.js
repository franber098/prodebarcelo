/**
 * DATOS DEL ADMINISTRADOR — editar manualmente según avance el Mundial.
 *
 * participantes_globales: usuarios que pagaron y enviaron prode por WhatsApp.
 * resultados_reales: marcadores y clasificados oficiales (vacío = pendiente).
 *
 * Formato de bracket por partido (mismo id que en el HTML, ej. "node-16L-1"):
 *   { homeTeam, awayTeam, homeScore, awayScore }
 * campeon: nombre exacto del equipo campeón (debe coincidir con teamFlags).
 */

const participantes_globales = [
    // Ejemplo — duplicar y pegar predicciones reales de cada participante:
    // {
    //     nombre: "Juan Pérez",
    //     codigo: "BRC-4521",
    //     campeon: "Argentina",
    //     bracket: {
    //         "node-16L-1": { homeTeam: "Brasil", awayTeam: "Marruecos", homeScore: "2", awayScore: "1" },
    //         "node-1-final": { homeTeam: "Argentina", awayTeam: "Francia", homeScore: "2", awayScore: "1" }
    //     },
    //     groupMatches: {}
    // }
];

const resultados_reales = {
    campeon: null,
    bracket: {
        // "node-16L-1": { homeTeam: "Brasil", awayTeam: "Marruecos", homeScore: "2", awayScore: "1" },
    },
    groupMatches: {}
};
