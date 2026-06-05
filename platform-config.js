/**
 * Configuración global de la plataforma PREDICT 2026.
 * Cambiá adminPassword antes de publicar.
 */
const PLATFORM_CONFIG = {
    adminPassword: "BarceloAdmin2026",
    adminPhone: "5493454014756",
    payment: {
        amount: "$5.000",
        alias: "barceloclub",
        cvu: "0000003100012345678901"
    },
    storageKey: "prode_platform_db_v1",
    /**
     * Opcional — para que registros y prodes lleguen al admin desde cualquier dispositivo.
     * Creá un bin gratis en https://jsonbin.io y pegá acá binId + X-Master-Key.
     * Si quedan vacíos, la DB vive solo en el navegador (usá Exportar/Importar en admin).
     */
    jsonbinBinId: "6a226607f5f4af5e29bc2797",
    jsonbinApiKey: "$2a$10$TR3kuAXRDa72xeU13.TbgO55xhRcKP/H6h5p/1T4T1aU0h0sv4BqK"
};
