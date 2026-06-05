/**
 * Fixture oficial FIFA — Mundial 2026 (48 equipos, 12 grupos).
 * Cada llave de 16avos define local/visitante según 1º, 2º o mejor 3º (pools).
 * Los node-id coinciden con el HTML del bracket (L = llave izquierda, R = derecha).
 */
const FIFA_ROUND_OF_32_FIXTURE = {
    "node-16L-1": { home: { rank: 1, group: "E" }, away: { thirdPool: ["A", "B", "C", "D", "F"] } },
    "node-16L-2": { home: { rank: 1, group: "I" }, away: { thirdPool: ["C", "D", "F", "G", "H"] } },
    "node-16L-3": { home: { rank: 2, group: "A" }, away: { rank: 2, group: "B" } },
    "node-16L-4": { home: { rank: 1, group: "F" }, away: { rank: 2, group: "C" } },
    "node-16L-5": { home: { rank: 2, group: "K" }, away: { rank: 2, group: "L" } },
    "node-16L-6": { home: { rank: 1, group: "H" }, away: { rank: 2, group: "J" } },
    "node-16L-7": { home: { rank: 1, group: "D" }, away: { thirdPool: ["B", "E", "F", "I", "J"] } },
    "node-16L-8": { home: { rank: 1, group: "G" }, away: { thirdPool: ["A", "E", "H", "I", "J"] } },
    "node-16R-1": { home: { rank: 1, group: "C" }, away: { rank: 2, group: "F" } },
    "node-16R-2": { home: { rank: 2, group: "E" }, away: { rank: 2, group: "I" } },
    "node-16R-3": { home: { rank: 1, group: "A" }, away: { thirdPool: ["C", "E", "F", "H", "I"] } },
    "node-16R-4": { home: { rank: 1, group: "L" }, away: { thirdPool: ["E", "H", "I", "J", "K"] } },
    "node-16R-5": { home: { rank: 1, group: "J" }, away: { rank: 2, group: "H" } },
    "node-16R-6": { home: { rank: 2, group: "D" }, away: { rank: 2, group: "G" } },
    "node-16R-7": { home: { rank: 1, group: "B" }, away: { thirdPool: ["E", "F", "G", "H", "I", "J"] } },
    "node-16R-8": { home: { rank: 1, group: "K" }, away: { thirdPool: ["D", "E", "I", "J", "L"] } }
};

/** Orden de asignación de mejores terceros a cada pool (según cuadro FIFA). */
const FIFA_THIRD_PLACE_SLOT_ORDER = [
    { matchId: "node-16L-1", slot: "away", pool: ["A", "B", "C", "D", "F"] },
    { matchId: "node-16L-2", slot: "away", pool: ["C", "D", "F", "G", "H"] },
    { matchId: "node-16L-7", slot: "away", pool: ["B", "E", "F", "I", "J"] },
    { matchId: "node-16L-8", slot: "away", pool: ["A", "E", "H", "I", "J"] },
    { matchId: "node-16R-3", slot: "away", pool: ["C", "E", "F", "H", "I"] },
    { matchId: "node-16R-4", slot: "away", pool: ["E", "H", "I", "J", "K"] },
    { matchId: "node-16R-7", slot: "away", pool: ["E", "F", "G", "H", "I", "J"] },
    { matchId: "node-16R-8", slot: "away", pool: ["D", "E", "I", "J", "L"] }
];

const ROUND_OF_32_MATCH_IDS = Object.keys(FIFA_ROUND_OF_32_FIXTURE);
