/**
 * Base de datos central (localStorage) para usuarios, resultados maestros y prodes.
 * Admin y app principal comparten el mismo origen en el mismo dominio.
 */
(function (global) {
    const STORAGE_KEY =
        (typeof PLATFORM_CONFIG !== "undefined" && PLATFORM_CONFIG.storageKey) ||
        "prode_platform_db_v1";
    const SESSION_KEY = "prode_user_session_v1";

    function defaultDb() {
        return {
            version: 1,
            pendingUsers: [],
            users: [],
            deniedUsers: [],
            masterResults: {
                campeon: null,
                subcampeon: null,
                tercerPuesto: null,
                bracket: {},
                groupMatches: {},
                thirdPlacePicks: {},
                locked: { group: {}, knockout: {} }
            },
            submissions: []
        };
    }

    function loadDb() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return defaultDb();
            const parsed = JSON.parse(raw);
            return { ...defaultDb(), ...parsed };
        } catch {
            return defaultDb();
        }
    }

    function mergeDatabases(base, incoming) {
        const out = { ...defaultDb(), ...base };
        if (!incoming) return out;

        ["pendingUsers", "users", "deniedUsers", "submissions"].forEach((key) => {
            const map = new Map((out[key] || []).map((item) => [item.id, item]));
            (incoming[key] || []).forEach((item) => map.set(item.id, item));
            out[key] = Array.from(map.values());
        });

        if (incoming.masterResults) {
            out.masterResults = {
                ...defaultDb().masterResults,
                ...out.masterResults,
                ...incoming.masterResults,
                bracket: {
                    ...(out.masterResults?.bracket || {}),
                    ...(incoming.masterResults.bracket || {})
                },
                groupMatches: {
                    ...(out.masterResults?.groupMatches || {}),
                    ...(incoming.masterResults.groupMatches || {})
                }
            };
        }

        return out;
    }

    function pushToJsonBin(db) {
        const binId = PLATFORM_CONFIG?.jsonbinBinId;
        const apiKey = PLATFORM_CONFIG?.jsonbinApiKey;
        if (!binId || !apiKey) return;

        fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Master-Key": apiKey
            },
            body: JSON.stringify(db)
        }).catch(() => {});
    }

    async function pullFromJsonBin() {
        const binId = PLATFORM_CONFIG?.jsonbinBinId;
        const apiKey = PLATFORM_CONFIG?.jsonbinApiKey;
        if (!binId || !apiKey) return null;

        try {
            const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
                headers: { "X-Master-Key": apiKey }
            });
            if (!res.ok) return null;
            const data = await res.json();
            return data.record || null;
        } catch {
            return null;
        }
    }

    function saveDb(db) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        global.dispatchEvent(new CustomEvent("prode-db-updated"));
        pushToJsonBin(db);
    }

    function uid() {
        return `usr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    function normalizeFullName(name) {
        return String(name || "")
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function splitFullName(fullName) {
        const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return { nombre: "", apellido: "" };
        return { nombre: parts[0], apellido: parts.slice(1).join(" ") };
    }

    async function hashPassword(password) {
        const text = String(password || "");
        if (!global.crypto?.subtle) {
            return btoa(text);
        }
        const buf = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(text)
        );
        return Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    function maskHash(hash) {
        if (!hash) return "—";
        return `${hash.slice(0, 12)}…${hash.slice(-6)}`;
    }

    function validatePasswordPolicy(password) {
        const pass = String(password || "");
        if (pass.length < 7) {
            return {
                ok: false,
                error:
                    "La contraseña debe tener al menos 7 caracteres e incluir mayúscula, minúscula, número y símbolo."
            };
        }
        const hasUpper = /[A-ZÁÉÍÓÚÜÑ]/.test(pass);
        const hasLower = /[a-záéíóúüñ]/.test(pass);
        const hasDigit = /\d/.test(pass);
        const hasSymbol = /[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ]/.test(pass);
        if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
            return {
                ok: false,
                error:
                    "La contraseña debe incluir al menos: 1 mayúscula, 1 minúscula, 1 número y 1 símbolo."
            };
        }
        return { ok: true };
    }

    function findUserByName(db, nombreCompleto) {
        const key = normalizeFullName(nombreCompleto);
        return (
            db.pendingUsers.find((u) => normalizeFullName(u.nombreCompleto) === key) ||
            db.users.find((u) => normalizeFullName(u.nombreCompleto) === key) ||
            db.deniedUsers.find((u) => normalizeFullName(u.nombreCompleto) === key) ||
            null
        );
    }

    function exportDb() {
        return JSON.stringify(loadDb(), null, 2);
    }

    function importDb(jsonText) {
        const parsed = JSON.parse(jsonText);
        saveDb({ ...defaultDb(), ...parsed });
    }

    async function syncFromRemote() {
        const remote = await pullFromJsonBin();
        if (!remote) return loadDb();
        const merged = mergeDatabases(loadDb(), remote);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        global.dispatchEvent(new CustomEvent("prode-db-updated"));
        return merged;
    }

    const ProdeDB = {
        loadDb,
        saveDb,
        exportDb,
        importDb,
        syncFromRemote,
        hashPassword,
        maskHash,
        normalizeFullName,
        splitFullName,

        async registerPending({ nombreCompleto, password }) {
            const full = String(nombreCompleto || "").trim().replace(/\s+/g, " ");
            const pass = String(password || "");
            if (!full || full.length < 3) {
                return { ok: false, error: "Ingresá un nombre completo válido." };
            }
            const policy = validatePasswordPolicy(pass);
            if (!policy.ok) return { ok: false, error: policy.error };

            const db = loadDb();
            const existing = findUserByName(db, full);
            if (existing) {
                if (existing.status === "approved") {
                    return { ok: false, error: "Ya existe una cuenta aprobada con ese nombre." };
                }
                if (existing.status === "pending") {
                    return { ok: false, error: "Ya hay una solicitud pendiente con ese nombre." };
                }
                if (existing.status === "denied") {
                    return {
                        ok: false,
                        error: "Tu solicitud fue denegada. Contactá al administrador."
                    };
                }
            }

            const passwordHash = await hashPassword(pass);
            const entry = {
                id: uid(),
                nombreCompleto: full,
                passwordHash,
                status: "pending",
                createdAt: new Date().toISOString()
            };

            db.pendingUsers.push(entry);
            saveDb(db);
            return { ok: true, user: entry };
        },

        getPendingUsers() {
            return loadDb().pendingUsers;
        },

        getApprovedUsers() {
            return loadDb().users;
        },

        getDeniedUsers() {
            return loadDb().deniedUsers;
        },

        approveUser(userId) {
            const db = loadDb();
            const idx = db.pendingUsers.findIndex((u) => u.id === userId);
            if (idx < 0) return { ok: false, error: "Usuario no encontrado." };

            const [user] = db.pendingUsers.splice(idx, 1);
            user.status = "approved";
            user.approvedAt = new Date().toISOString();
            db.users.push(user);
            saveDb(db);
            return { ok: true, user };
        },

        denyUser(userId) {
            const db = loadDb();
            const idx = db.pendingUsers.findIndex((u) => u.id === userId);
            if (idx < 0) return { ok: false, error: "Usuario no encontrado." };

            const [user] = db.pendingUsers.splice(idx, 1);
            user.status = "denied";
            user.deniedAt = new Date().toISOString();
            db.deniedUsers.push(user);
            saveDb(db);
            return { ok: true, user };
        },

        async login({ nombreCompleto, password }) {
            const full = String(nombreCompleto || "").trim();
            const pass = String(password || "");
            if (!full || !pass) {
                return { ok: false, error: "Completá nombre y contraseña." };
            }

            const db = loadDb();
            const key = normalizeFullName(full);
            const passwordHash = await hashPassword(pass);

            const pending = db.pendingUsers.find(
                (u) => normalizeFullName(u.nombreCompleto) === key
            );
            if (pending) {
                if (pending.passwordHash !== passwordHash) {
                    return { ok: false, error: "Contraseña incorrecta." };
                }
                return {
                    ok: false,
                    pending: true,
                    error: "Tu cuenta está en revisión. El administrador verificará tu pago pronto."
                };
            }

            const denied = db.deniedUsers.find(
                (u) => normalizeFullName(u.nombreCompleto) === key
            );
            if (denied) {
                return {
                    ok: false,
                    denied: true,
                    error: "Tu acceso fue denegado. Contactá al administrador si creés que es un error."
                };
            }

            const approved = db.users.find(
                (u) => normalizeFullName(u.nombreCompleto) === key
            );
            if (!approved) {
                return { ok: false, error: "No encontramos una cuenta con ese nombre. Registrate primero." };
            }
            if (approved.passwordHash !== passwordHash) {
                return { ok: false, error: "Contraseña incorrecta." };
            }

            const { nombre, apellido } = splitFullName(approved.nombreCompleto);
            const sessionUser = {
                id: approved.id,
                nombreCompleto: approved.nombreCompleto,
                nombre,
                apellido,
                approvedAt: approved.approvedAt
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
            return { ok: true, user: sessionUser };
        },

        getSessionUser() {
            try {
                const raw = localStorage.getItem(SESSION_KEY);
                if (!raw) return null;
                return JSON.parse(raw);
            } catch {
                return null;
            }
        },

        setSessionUser(user) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        },

        clearSession() {
            localStorage.removeItem(SESSION_KEY);
        },

        getMasterResults() {
            const master = loadDb().masterResults || defaultDb().masterResults;
            if (!master.locked) master.locked = { group: {}, knockout: {} };
            return master;
        },

        getPublishedResults() {
            const master = ProdeDB.getMasterResults();
            const lockedG = master.locked?.group || {};
            const lockedK = master.locked?.knockout || {};

            const groupMatches = {};
            Object.entries(master.groupMatches || {}).forEach(([key, val]) => {
                if (lockedG[key]) groupMatches[key] = val;
            });

            const bracket = {};
            Object.entries(master.bracket || {}).forEach(([key, val]) => {
                if (lockedK[key]) bracket[key] = val;
            });

            const finalLocked = lockedK["node-1-final"];
            return {
                campeon: finalLocked ? master.campeon : null,
                subcampeon: finalLocked ? master.subcampeon : null,
                tercerPuesto: lockedK["node-3-tercero"] ? master.tercerPuesto : null,
                bracket,
                groupMatches
            };
        },

        isSnapshotEmpty(snapshot) {
            if (!snapshot) return true;
            const gm = snapshot.groupMatches || {};
            const hasGroup = Object.values(gm).some((s) => {
                const h = parseInt(s?.home, 10);
                const a = parseInt(s?.away, 10);
                return !isNaN(h) && !isNaN(a);
            });
            if (hasGroup) return false;

            const br = snapshot.bracket || {};
            return !Object.values(br).some((n) => {
                const h = parseInt(n?.homeScore, 10);
                const a = parseInt(n?.awayScore, 10);
                return (
                    n?.homeTeam &&
                    n?.awayTeam &&
                    n.homeTeam !== "[ ? ]" &&
                    n.awayTeam !== "[ ? ]" &&
                    !isNaN(h) &&
                    !isNaN(a)
                );
            });
        },

        isValidSubmission(snapshot) {
            return !ProdeDB.isSnapshotEmpty(snapshot) && !!snapshot?.isComplete;
        },

        setMasterResults(results) {
            const db = loadDb();
            db.masterResults = { ...defaultDb().masterResults, ...results };
            saveDb(db);
        },

        updateMasterResults(partial) {
            const db = loadDb();
            db.masterResults = {
                ...defaultDb().masterResults,
                ...db.masterResults,
                ...partial
            };
            saveDb(db);
            return db.masterResults;
        },

        getSubmissions() {
            return loadDb().submissions || [];
        },

        getSubmissionByUserId(userId) {
            return loadDb().submissions.find((s) => s.userId === userId) || null;
        },

        isUserProdeLocked(userId) {
            if (!userId) return false;
            const sub = ProdeDB.getSubmissionByUserId(userId);
            if (!sub) return false;
            return !ProdeDB.isSnapshotEmpty(sub);
        },

        submitProde({ userId, nombreCompleto, snapshot }) {
            const db = loadDb();
            const existingIdx = db.submissions.findIndex((s) => s.userId === userId);
            const existing = existingIdx >= 0 ? db.submissions[existingIdx] : null;
            if (existing && !ProdeDB.isSnapshotEmpty(existing)) {
                return { ok: false, error: "Ya enviaste tu prode. No podés modificarlo." };
            }
            if (existing && existingIdx >= 0) {
                db.submissions.splice(existingIdx, 1);
            }

            if (ProdeDB.isSnapshotEmpty(snapshot)) {
                return {
                    ok: false,
                    error: "No podés enviar un prode vacío. Completá tus predicciones primero."
                };
            }

            if (!snapshot?.isComplete) {
                return {
                    ok: false,
                    error: "Tu prode no está completo. Revisá que todos los partidos de grupos y eliminatoria tengan resultado."
                };
            }

            const entry = {
                id: `sub_${Date.now()}`,
                userId,
                nombreCompleto,
                submittedAt: new Date().toISOString(),
                locked: true,
                bracket: snapshot.bracket || {},
                groupMatches: snapshot.groupMatches || {},
                campeon: snapshot.campeon || null,
                subcampeon: snapshot.subcampeon || null,
                tercerPuesto: snapshot.tercerPuesto || null,
                thirdPlacePicks: snapshot.thirdPlacePicks || {}
            };

            db.submissions.push(entry);
            saveDb(db);
            return { ok: true, submission: entry };
        },

        migrateLegacyAdminData() {
            const db = loadDb();
            if (typeof resultados_reales === "undefined") return;

            const master = db.masterResults || {};
            const hasData =
                Object.keys(master.bracket || {}).length > 0 ||
                Object.keys(master.groupMatches || {}).length > 0 ||
                master.campeon;

            if (!hasData && resultados_reales) {
                db.masterResults = {
                    ...defaultDb().masterResults,
                    campeon: resultados_reales.campeon || null,
                    bracket: { ...(resultados_reales.bracket || {}) },
                    groupMatches: { ...(resultados_reales.groupMatches || {}) }
                };
                saveDb(db);
            }

            if (
                typeof participantes_globales !== "undefined" &&
                Array.isArray(participantes_globales) &&
                participantes_globales.length &&
                db.submissions.length === 0
            ) {
                participantes_globales.forEach((p) => {
                    const nombreCompleto =
                        p.nombreCompleto ||
                        `${p.nombre || ""} ${p.apellido || ""}`.trim();
                    db.submissions.push({
                        id: `sub_legacy_${p.codigo || nombreCompleto}`,
                        userId: p.codigo || `legacy_${normalizeFullName(nombreCompleto)}`,
                        nombreCompleto,
                        submittedAt: new Date().toISOString(),
                        locked: true,
                        bracket: p.bracket || {},
                        groupMatches: p.groupMatches || {},
                        campeon: p.campeon || null,
                        subcampeon: null,
                        tercerPuesto: null,
                        thirdPlacePicks: {}
                    });
                });
                saveDb(db);
            }
        }
    };

    ProdeDB.migrateLegacyAdminData();
    global.ProdeDB = ProdeDB;
})(window);
