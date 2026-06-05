document.addEventListener("DOMContentLoaded", () => {
    const LEGACY_PREDICTION_KEYS = ["user_prediction", "prode_prediccion"];

    function normalizePersonKey(user) {
        if (!user?.nombre) return null;
        const strip = (s) =>
            String(s)
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
        const nombre = strip(user.nombre);
        const apellido = strip(user.apellido || "");
        if (!nombre) return null;
        return `${nombre}|${apellido}`;
    }

    function usersSamePerson(userA, userB) {
        if (!userA?.nombre || !userB?.nombre) return false;
        return normalizePersonKey(userA) === normalizePersonKey(userB);
    }

    function getPredictionStorageKey(user) {
        const personKey = normalizePersonKey(user);
        if (!personKey || personKey === "|") return null;
        return `prode_${personKey}`;
    }

    function participantToUser(participant) {
        if (!participant) return null;
        if (participant.apellido) {
            return { nombre: participant.nombre, apellido: participant.apellido };
        }
        const parts = String(participant.nombre || "").trim().split(/\s+/);
        if (parts.length <= 1) {
            return { nombre: parts[0] || "", apellido: "" };
        }
        return { nombre: parts[0], apellido: parts.slice(1).join(" ") };
    }

    function getActiveUser() {
        if (prodeState.user?.id) return prodeState.user;
        const session = typeof ProdeDB !== "undefined" ? ProdeDB.getSessionUser() : null;
        if (session?.id) {
            prodeState.user = session;
            return session;
        }
        return null;
    }

    function analyzeProdeCompleteness(snapshot) {
        const groupMatches = snapshot?.groupMatches || {};
        const bracket = snapshot?.bracket || {};

        let filledGroups = 0;
        const missingGroups = [];
        matchesData.forEach((m) => {
            const key = String(m.id);
            const s = groupMatches[key] || groupMatches[m.id];
            const h = parseInt(s?.home, 10);
            const a = parseInt(s?.away, 10);
            if (!isNaN(h) && !isNaN(a)) {
                filledGroups += 1;
            } else {
                missingGroups.push(`Grupo ${m.group}: ${m.home} vs ${m.away}`);
            }
        });

        let filledKo = 0;
        const missingKo = [];
        ALL_KNOCKOUT_MATCH_IDS.forEach((matchId) => {
            const node = bracket[matchId];
            const home = normalizeTeamName(node?.homeTeam);
            const away = normalizeTeamName(node?.awayTeam);
            const h = parseInt(node?.homeScore, 10);
            const a = parseInt(node?.awayScore, 10);
            if (
                !isPlaceholderTeam(home) &&
                !isPlaceholderTeam(away) &&
                !isNaN(h) &&
                !isNaN(a)
            ) {
                filledKo += 1;
            } else {
                missingKo.push(matchId.replace("node-", ""));
            }
        });

        const totalGroups = matchesData.length;
        const totalKo = ALL_KNOCKOUT_MATCH_IDS.length;
        const empty = filledGroups === 0 && filledKo === 0;
        const complete =
            filledGroups === totalGroups &&
            filledKo === totalKo &&
            !!snapshot?.campeon;

        return {
            empty,
            complete,
            filledGroups,
            totalGroups,
            filledKo,
            totalKo,
            missingGroups,
            missingKo
        };
    }

    function setFinalizeHint(html, variant) {
        const hint = document.getElementById("finalize-status-hint");
        if (!hint) return;
        hint.innerHTML = html;
        hint.classList.remove("is-ready", "is-locked");
        if (variant) hint.classList.add(variant);
    }

    function updateFinalizeButtonState() {
        const btn = document.getElementById("btn-finalize");
        if (!btn) return;

        const fullProdeMsg =
            "Debés completar el <strong>prode al 100%</strong>: todos los partidos de <strong>fase de grupos</strong> y <strong>fase eliminatoria</strong>. Solo así se habilita el envío.";

        if (isProdeLockedForCurrentUser()) {
            btn.disabled = true;
            btn.classList.add("btn-finalize--disabled");
            btn.title = "Ya enviaste tu prode. No podés modificarlo.";
            setFinalizeHint(
                "<strong>Prode enviado.</strong> Tu predicción está bloqueada. Podés ver tu resumen y posición en el menú <strong>Mi Prode</strong>.",
                "is-locked"
            );
            return;
        }

        if (!getActiveUser()?.id) {
            btn.disabled = true;
            btn.classList.add("btn-finalize--disabled");
            btn.title = "Iniciá sesión para enviar tu prode.";
            setFinalizeHint(
                `${fullProdeMsg} Además, tenés que <strong>iniciar sesión</strong> con tu cuenta aprobada.`,
                null
            );
            return;
        }

        const snapshot = collectPredictionSnapshot();
        const stats = analyzeProdeCompleteness(snapshot);
        const missingGroups = stats.totalGroups - stats.filledGroups;
        const missingKo = stats.totalKo - stats.filledKo;

        if (!stats.complete) {
            btn.disabled = true;
            btn.classList.add("btn-finalize--disabled");

            if (stats.empty) {
                btn.title =
                    "Completá el prode al 100% (fase de grupos + eliminatoria) para habilitar el envío.";
                setFinalizeHint(
                    `${fullProdeMsg} Una vez enviado, <strong>no podrás modificarlo</strong>.`,
                    null
                );
            } else {
                btn.title = `Prode incompleto: faltan ${missingGroups} partidos de grupos y ${missingKo} de eliminatoria.`;
                setFinalizeHint(
                    `${fullProdeMsg}<br><span class="text-amber-300/90">Progreso: ${stats.filledGroups}/${stats.totalGroups} partidos de grupos · ${stats.filledKo}/${stats.totalKo} de eliminatoria.</span> Faltan <strong>${missingGroups}</strong> de grupos y <strong>${missingKo}</strong> de eliminatoria.`,
                    null
                );
            }
            return;
        }

        btn.disabled = false;
        btn.classList.remove("btn-finalize--disabled");
        btn.title =
            "Tu prode está completo. Al enviarlo quedará bloqueado y no podrás modificarlo.";
        setFinalizeHint(
            "<strong>¡Prode completo!</strong> Revisá tus predicciones y, cuando estés seguro, envialo. <strong>No podrás modificarlo después.</strong>",
            "is-ready"
        );
    }

    const teamFlags = {
        "México": "mx", "Sudáfrica": "za", "Corea del Sur": "kr", "República Checa": "cz",
        "Canadá": "ca", "Bosnia-Herzegovina": "ba", "Qatar": "qa", "Suiza": "ch",
        "Brasil": "br", "Marruecos": "ma", "Haití": "ht", "Escocia": "gb-sct",
        "Estados Unidos": "us", "Paraguay": "py", "Australia": "au", "Turquía": "tr",
        "Alemania": "de", "Curazao": "cw", "Costa de Marfil": "ci", "Ecuador": "ec",
        "Países Bajos": "nl", "Japón": "jp", "Suecia": "se", "Túnez": "tn",
        "Bélgica": "be", "Egipto": "eg", "Irán": "ir", "Nueva Zelanda": "nz",
        "España": "es", "Cabo Verde": "cv", "Arabia Saudita": "sa", "Uruguay": "uy",
        "Francia": "fr", "Senegal": "sn", "Irak": "iq", "Noruega": "no",
        "Argentina": "ar", "Argelia": "dz", "Austria": "at", "Jordania": "jo",
        "Portugal": "pt", "RD Congo": "cd", "Uzbekistán": "uz", "Colombia": "co",
        "Inglaterra": "gb-eng", "Croacia": "hr", "Ghana": "gh", "Panamá": "pa"
    };

    const groupsData = {
        A: ["México", "Sudáfrica", "Corea del Sur", "República Checa"],
        B: ["Canadá", "Bosnia-Herzegovina", "Qatar", "Suiza"],
        C: ["Brasil", "Marruecos", "Haití", "Escocia"],
        D: ["Estados Unidos", "Paraguay", "Australia", "Turquía"],
        E: ["Alemania", "Curazao", "Costa de Marfil", "Ecuador"],
        F: ["Países Bajos", "Japón", "Suecia", "Túnez"],
        G: ["Bélgica", "Egipto", "Irán", "Nueva Zelanda"],
        H: ["España", "Cabo Verde", "Arabia Saudita", "Uruguay"],
        I: ["Francia", "Senegal", "Irak", "Noruega"],
        J: ["Argentina", "Argelia", "Austria", "Jordania"],
        K: ["Portugal", "RD Congo", "Uzbekistán", "Colombia"],
        L: ["Inglaterra", "Croacia", "Ghana", "Panamá"]
    };

    const allTeamsSorted = Object.keys(teamFlags).sort();

    function getFlagUrl(teamName) {
        const code = teamFlags[teamName];
        return code ? `https://flagcdn.com/w80/${code}.png` : "";
    }

    const prodeState = {
        user: null,
        groupMatches: {},
        bracket: {},
        thirdPlacePicks: {}
    };

    let thirdPlaceAmbiguousSlots = {};

    const matchdaySchedule = {
        1: [
            { date: "11 de Junio 2026", times: ["13:00", "16:00", "19:00", "22:00"] },
            { date: "12 de Junio 2026", times: ["13:00", "16:00", "19:00", "22:00"] },
            { date: "13 de Junio 2026", times: ["13:00", "16:00", "19:00", "22:00"] }
        ],
        2: [
            { date: "18 de Junio 2026", times: ["13:00", "16:00", "19:00", "22:00"] },
            { date: "19 de Junio 2026", times: ["13:00", "16:00", "19:00", "22:00"] },
            { date: "20 de Junio 2026", times: ["13:00", "16:00", "19:00", "22:00"] }
        ],
        3: [
            { date: "23 de Junio 2026", times: ["13:00", "16:00", "19:00", "22:00"] },
            { date: "24 de Junio 2026", times: ["13:00", "16:00", "19:00", "22:00"] },
            { date: "25 de Junio 2026", times: ["13:00", "16:00", "19:00", "22:00"] },
            { date: "26 de Junio 2026", times: ["13:00", "16:00", "19:00", "22:00"] },
            { date: "27 de Junio 2026", times: ["13:00", "16:00", "19:00", "22:00"] }
        ]
    };

    const groupOrder = "ABCDEFGHIJKL".split("");
    const matchesData = [];
    let matchId = 1;

    Object.keys(groupsData).forEach(group => {
        const teams = groupsData[group];
        const pairings = [
            { p: [0, 1], md: 1 }, { p: [2, 3], md: 1 },
            { p: [0, 2], md: 2 }, { p: [1, 3], md: 2 },
            { p: [0, 3], md: 3 }, { p: [1, 2], md: 3 }
        ];
        const groupIndex = groupOrder.indexOf(group);

        pairings.forEach((pair, idx) => {
            const mdPool = matchdaySchedule[pair.md];
            const slot = mdPool[(groupIndex + idx) % mdPool.length];
            const timeStr = slot.times[(groupIndex + idx) % slot.times.length];
            matchesData.push({
                id: matchId++,
                group,
                home: teams[pair.p[0]],
                away: teams[pair.p[1]],
                date: slot.date,
                time: timeStr
            });
        });
    });

    const entryModal = document.getElementById("entry-modal");
    const entryForm = document.getElementById("entry-form");
    const loginForm = document.getElementById("login-form");
    const nombreCompletoInput = document.getElementById("nombre-completo");
    const regPasswordInput = document.getElementById("reg-password");
    const loginNombreInput = document.getElementById("login-nombre");
    const loginPasswordInput = document.getElementById("login-password");
    const registerErrorDiv = document.getElementById("register-error");
    const loginErrorDiv = document.getElementById("login-error");
    const loginInfoDiv = document.getElementById("login-info");

    const screen1 = document.getElementById("screen-1");
    const screen2 = document.getElementById("screen-2");
    const screen3 = document.getElementById("screen-3");
    const registeredUserDisplay = document.getElementById("registered-user-display");
    const btnWhatsapp = document.getElementById("btn-whatsapp");
    const btnGoLogin = document.getElementById("btn-go-login");
    const btnGoRegister = document.getElementById("btn-go-register");
    const btnAfterPaymentLogin = document.getElementById("btn-after-payment-login");
    const adminPhoneNumber =
        (typeof PLATFORM_CONFIG !== "undefined" && PLATFORM_CONFIG.adminPhone) ||
        "5493454014756";

    const bracketRounds = [
        { label: "16avos", ids: [
            "node-16L-1","node-16L-2","node-16L-3","node-16L-4",
            "node-16L-5","node-16L-6","node-16L-7","node-16L-8",
            "node-16R-1","node-16R-2","node-16R-3","node-16R-4",
            "node-16R-5","node-16R-6","node-16R-7","node-16R-8"
        ]},
        { label: "Octavos", ids: [
            "node-8L-1","node-8L-2","node-8L-3","node-8L-4",
            "node-8R-1","node-8R-2","node-8R-3","node-8R-4"
        ]},
        { label: "Cuartos", ids: ["node-4L-1","node-4L-2","node-4R-1","node-4R-2"]},
        { label: "Semis", ids: ["node-2L-1","node-2R-1"]},
        { label: "Final", ids: ["node-1-final"]},
        { label: "3er Puesto", ids: ["node-3-tercero"]}
    ];

    function getBracketSlotName(matchId, slot) {
        return document.getElementById(`name-${matchId}-${slot}`)?.textContent.trim() || "";
    }

    function getBracketSlotScore(matchId, slot) {
        return document.getElementById(`input-${matchId}-${slot}`)?.value.trim() || "";
    }

    function formatMatchPrediction(matchId) {
        const home = getBracketSlotName(matchId, "home");
        const away = getBracketSlotName(matchId, "away");
        if (!home || !away || home === "[ ? ]" || away === "[ ? ]") return null;

        const homeScore = getBracketSlotScore(matchId, "home") || "-";
        const awayScore = getBracketSlotScore(matchId, "away") || "-";
        return `${home} ${homeScore}-${awayScore} ${away}`;
    }

    function getChampionFromFinal(home, away, scoreH, scoreA) {
        const parsedHome = parseInt(scoreH, 10);
        const parsedAway = parseInt(scoreA, 10);
        if (isNaN(parsedHome) || isNaN(parsedAway)) return null;
        if (parsedHome > parsedAway) return home;
        if (parsedAway > parsedHome) return away;
        return null;
    }

    function getChampionFromBracketData(bracketData) {
        const fin = bracketData?.["node-1-final"];
        if (!fin) return null;
        return getChampionFromFinal(
            fin.homeTeam,
            fin.awayTeam,
            fin.homeScore,
            fin.awayScore
        );
    }

    function collectBracketSnapshot() {
        const bracket = {};
        bracketRounds.forEach((round) => {
            round.ids.forEach((matchId) => {
                bracket[matchId] = {
                    homeTeam: getBracketSlotName(matchId, "home"),
                    awayTeam: getBracketSlotName(matchId, "away"),
                    homeScore: getBracketSlotScore(matchId, "home"),
                    awayScore: getBracketSlotScore(matchId, "away")
                };
            });
        });
        return bracket;
    }

    function syncGroupMatchesFromDOM() {
        document.querySelectorAll(".match-input").forEach((input) => {
            const id = input.getAttribute("data-id");
            const type = input.getAttribute("data-type");
            if (!id || !type) return;
            if (!prodeState.groupMatches[id]) prodeState.groupMatches[id] = { home: "", away: "" };
            prodeState.groupMatches[id][type] = input.value;
        });
    }

    function syncBracketScoresFromDOM() {
        document.querySelectorAll(".bracket-score").forEach((input) => {
            const matchId = input.getAttribute("data-match");
            const slot = input.getAttribute("data-slot");
            if (!matchId || !slot) return;
            if (!prodeState.bracket[matchId]) {
                prodeState.bracket[matchId] = {
                    teamHome: null,
                    teamAway: null,
                    scoreHome: "",
                    scoreAway: ""
                };
            }
            if (slot === "home") prodeState.bracket[matchId].scoreHome = input.value;
            else prodeState.bracket[matchId].scoreAway = input.value;
        });
    }

    function loadUserPrediction(forUser) {
        const user = forUser || getActiveUser();
        const key = getPredictionStorageKey(user);
        if (!key || !user?.id) return null;

        const raw = localStorage.getItem(key);
        if (!raw) return null;

        try {
            const data = JSON.parse(raw);
            if (data?.user && user && !usersSamePerson(data.user, user)) {
                return null;
            }
            return data;
        } catch {
            return null;
        }
    }

    function loadUserPredictionWithLegacyMigration(forUser) {
        const user = forUser || getActiveUser();
        let data = loadUserPrediction(user);
        if (data || !user?.id) return data;

        const legacyKey = `prode_${user.id}`;
        const raw = localStorage.getItem(legacyKey);
        if (!raw) return null;

        try {
            data = JSON.parse(raw);
            if (data?.user && !usersSamePerson(data.user, user)) return null;
            if (data) saveUserPrediction({ ...data, user });
            return data;
        } catch {
            return null;
        }
    }

    function saveUserPrediction(predictionData) {
        const user = predictionData?.user || getActiveUser();
        const key = getPredictionStorageKey(user);
        if (!key) return;

        localStorage.setItem(key, JSON.stringify(predictionData));
        LEGACY_PREDICTION_KEYS.forEach((legacyKey) => localStorage.removeItem(legacyKey));
    }

    function clearAllPredictionsUI() {
        skipBracketAdvance = true;
        prodeState.groupMatches = {};
        prodeState.bracket = {};
        prodeState.thirdPlacePicks = {};
        thirdPlaceAmbiguousSlots = {};

        ALL_KNOCKOUT_MATCH_IDS.forEach((matchId) => {
            setSlotData(matchId, "home", null);
            setSlotData(matchId, "away", null);
            const inputH = document.getElementById(`input-${matchId}-home`);
            const inputA = document.getElementById(`input-${matchId}-away`);
            if (inputH) inputH.value = "";
            if (inputA) inputA.value = "";
        });

        skipBracketAdvance = false;

        renderMatches(activeGroupPill || "A");
    }

    function loadPredictionForActiveUser() {
        clearAllPredictionsUI();
        const user = getActiveUser();
        if (!user?.id) return;

        if (ProdeDB.isUserProdeLocked(user.id)) {
            const submission = ProdeDB.getSubmissionByUserId(user.id);
            if (submission) {
                applyPredictionToUI({
                    groupMatches: submission.groupMatches || {},
                    bracket: submission.bracket || {},
                    campeon: submission.campeon,
                    thirdPlacePicks: submission.thirdPlacePicks || {}
                });
                return;
            }
        }

        const saved = loadUserPredictionWithLegacyMigration(user);
        if (saved && saved.user && usersSamePerson(saved.user, user)) {
            applyPredictionToUI(saved);
        }
    }

    function resetSessionForNewRegistration() {
        prodeState.user = null;
        prodeState.groupMatches = {};
        prodeState.bracket = {};
        prodeState.thirdPlacePicks = {};
        thirdPlaceAmbiguousSlots = {};
        clearAllPredictionsUI();
    }

    let skipBracketAdvance = false;

    function applyPredictionToUI(data) {
        if (!data) return;

        const active = getActiveUser();
        if (active && data.user && !usersSamePerson(data.user, active)) {
            return;
        }

        if (data.user?.nombre) {
            prodeState.user = data.user;
        }

        if (data.groupMatches && typeof data.groupMatches === "object") {
            prodeState.groupMatches = { ...data.groupMatches };
        }

        if (data.thirdPlacePicks && typeof data.thirdPlacePicks === "object") {
            prodeState.thirdPlacePicks = { ...data.thirdPlacePicks };
        } else {
            prodeState.thirdPlacePicks = {};
        }

        skipBracketAdvance = true;

        if (data.bracket && typeof data.bracket === "object") {
            Object.entries(data.bracket).forEach(([matchId, node]) => {
                if (!node) return;
                const homeTeam = normalizeTeamName(node.homeTeam);
                const awayTeam = normalizeTeamName(node.awayTeam);

                if (homeTeam && !isPlaceholderTeam(homeTeam)) {
                    setSlotData(matchId, "home", homeTeam);
                }
                if (awayTeam && !isPlaceholderTeam(awayTeam)) {
                    setSlotData(matchId, "away", awayTeam);
                }
            });

            Object.entries(data.bracket).forEach(([matchId, node]) => {
                if (!node) return;
                const inputH = document.getElementById(`input-${matchId}-home`);
                const inputA = document.getElementById(`input-${matchId}-away`);
                if (inputH && node.homeScore !== undefined) inputH.value = node.homeScore;
                if (inputA && node.awayScore !== undefined) inputA.value = node.awayScore;

                if (!prodeState.bracket[matchId]) {
                    prodeState.bracket[matchId] = {
                        teamHome: null,
                        teamAway: null,
                        scoreHome: "",
                        scoreAway: ""
                    };
                }
                prodeState.bracket[matchId].scoreHome = String(node.homeScore ?? "");
                prodeState.bracket[matchId].scoreAway = String(node.awayScore ?? "");
            });
        }

        skipBracketAdvance = false;
        ALL_KNOCKOUT_MATCH_IDS.forEach((matchId) => checkMatchAdvance(matchId));

        renderMatches(activeGroupPill || "A");
        syncKnockoutFromGroupStage();
        applyKnockoutTeamSlotLocks();
    }

    function buildRawPredictionSnapshot() {
        syncGroupMatchesFromDOM();
        syncBracketScoresFromDOM();
        const bracket = collectBracketSnapshot();
        const final = bracket["node-1-final"];
        const campeon = final
            ? getChampionFromFinal(
                final.homeTeam,
                final.awayTeam,
                final.homeScore,
                final.awayScore
            )
            : null;

        const sessionUser = getActiveUser();
        return {
            user: sessionUser ? { ...sessionUser } : null,
            groupMatches: { ...prodeState.groupMatches },
            bracket,
            campeon,
            thirdPlacePicks: { ...(prodeState.thirdPlacePicks || {}) },
            savedAt: new Date().toISOString()
        };
    }

    function collectPredictionSnapshot() {
        const snapshot = buildRawPredictionSnapshot();
        snapshot.summary = compilePredictionSummaryFromData(snapshot);
        return snapshot;
    }

    function formatKnockoutLineFromNode(node) {
        if (!node) return null;
        const home = normalizeTeamName(node.homeTeam);
        const away = normalizeTeamName(node.awayTeam);
        if (isPlaceholderTeam(home) || isPlaceholderTeam(away)) return null;

        const homeScore = String(node.homeScore ?? "").trim() || "-";
        const awayScore = String(node.awayScore ?? "").trim() || "-";
        const winner = getMatchWinner(home, away, homeScore, awayScore);

        let line = `${home} ${homeScore}-${awayScore} ${away}`;
        if (winner) {
            line += ` → Clasifica: ${winner}`;
        } else if (homeScore !== "-" && awayScore !== "-" && homeScore === awayScore) {
            line += " → Empate (sin ganador definido)";
        } else if (homeScore === "-" || awayScore === "-") {
            line += " → Goles pendientes";
        }
        return line;
    }

    function getPredictionExportBundle(forUser) {
        const snapshot = buildRawPredictionSnapshot();
        const user = forUser || getActiveUser() || snapshot.user;
        const stored = user ? loadUserPredictionWithLegacyMigration(user) : null;

        if (stored?.user && user && !usersSamePerson(stored.user, user)) {
            return { ...snapshot, user };
        }

        if (stored?.groupMatches) {
            snapshot.groupMatches = {
                ...stored.groupMatches,
                ...snapshot.groupMatches
            };
        }

        if (stored?.bracket) {
            Object.keys(stored.bracket).forEach((matchId) => {
                const live = snapshot.bracket[matchId];
                const saved = stored.bracket[matchId];
                if (!saved) return;
                const liveEmpty =
                    isPlaceholderTeam(live?.homeTeam) && isPlaceholderTeam(live?.awayTeam);
                const savedHasTeams =
                    !isPlaceholderTeam(saved.homeTeam) || !isPlaceholderTeam(saved.awayTeam);
                if (liveEmpty && savedHasTeams) {
                    snapshot.bracket[matchId] = { ...saved };
                } else if (live && saved) {
                    snapshot.bracket[matchId] = {
                        homeTeam: !isPlaceholderTeam(live.homeTeam)
                            ? live.homeTeam
                            : saved.homeTeam,
                        awayTeam: !isPlaceholderTeam(live.awayTeam)
                            ? live.awayTeam
                            : saved.awayTeam,
                        homeScore: live.homeScore !== "" ? live.homeScore : saved.homeScore,
                        awayScore: live.awayScore !== "" ? live.awayScore : saved.awayScore
                    };
                }
            });
        }

        if (!snapshot.campeon && stored?.campeon) {
            snapshot.campeon = stored.campeon;
        }

        snapshot.user = user || snapshot.user;
        return snapshot;
    }

    function buildRegistrationWhatsappMessage(user) {
        const u = user || pendingRegistration;
        const payment =
            typeof PLATFORM_CONFIG !== "undefined" ? PLATFORM_CONFIG.payment : null;
        const amount = payment?.amount || "$5.000";
        const alias = payment?.alias || "barceloclub";
        const fullName =
            u?.nombreCompleto || `${u?.nombre || ""} ${u?.apellido || ""}`.trim();

        if (!fullName) {
            return "¡Hola! Quiero registrarme en el Prode de Barceló Club.";
        }
        return (
            "¡Hola! Quiero registrar mi cuenta en el Prode de Barceló Club.\n\n" +
            `Nombre completo: ${fullName}\n` +
            `Inscripción: ${amount}\n` +
            `Alias: ${alias}\n\n` +
            "Adjunto comprobante de pago. ¡Gracias!"
        );
    }

    function buildFullWhatsappProdeMessage(user) {
        const u = user || prodeState.user;
        if (!u?.nombre) {
            return "Prode Mundial 2026: completá tu registro y predicciones en la app.";
        }

        const data = getPredictionExportBundle(u);
        const lines = [];

        lines.push("🏆 PRODE MUNDIAL 2026 — PREDICCIONES COMPLETAS");
        lines.push("══════════════════════════════════");
        lines.push("");
        lines.push("👤 DATOS DEL PARTICIPANTE");
        lines.push(`Nombre: ${u.nombre} ${u.apellido || ""}`.trim());
        lines.push(`Código de usuario: ${u.id || "—"}`);
        if (u.id) {
            lines.push(`Clave de activación: ${(u.id + "OK").toUpperCase()}`);
        }
        if (u.pago) lines.push(`Medio de pago: ${u.pago}`);
        lines.push(`Fecha de envío: ${new Date().toLocaleString("es-AR")}`);
        lines.push("");

        lines.push("📋 FASE DE GRUPOS");
        let hasGroups = false;
        groupOrder.forEach((groupLetter) => {
            const groupMatches = matchesData.filter((m) => m.group === groupLetter);
            const groupLines = [];
            groupMatches.forEach((m) => {
                const scores = data.groupMatches?.[m.id] || { home: "", away: "" };
                const h = String(scores.home ?? "").trim();
                const a = String(scores.away ?? "").trim();
                if (h === "" && a === "") return;
                groupLines.push(
                    `  • ${m.home} ${h || "-"} - ${a || "-"} ${m.away} (${m.date}, ${m.time} hs · Grupo ${m.group})`
                );
            });
            if (groupLines.length) {
                hasGroups = true;
                lines.push(`Grupo ${groupLetter}:`);
                lines.push(...groupLines);
            }
        });
        if (!hasGroups) {
            lines.push("  (Sin goles cargados en fase de grupos)");
        }
        lines.push("");

        const bracket = data.bracket || {};
        const elimRounds = ["16avos", "Octavos", "Cuartos", "Semis"];

        lines.push("⚽ FASE ELIMINATORIA — LLAVE A (izquierda)");
        let hasLeft = false;
        bracketRounds.forEach((round) => {
            if (!elimRounds.includes(round.label)) return;
            const roundLines = [];
            round.ids.forEach((matchId) => {
                if (!matchId.includes("L")) return;
                const line = formatKnockoutLineFromNode(bracket[matchId]);
                if (line) roundLines.push(`  • ${line}`);
            });
            if (roundLines.length) {
                hasLeft = true;
                lines.push(`${round.label}:`);
                lines.push(...roundLines);
            }
        });
        if (!hasLeft) lines.push("  (Sin predicciones en Llave A)");

        lines.push("");
        lines.push("⚽ FASE ELIMINATORIA — LLAVE B (derecha)");
        let hasRight = false;
        bracketRounds.forEach((round) => {
            if (!elimRounds.includes(round.label)) return;
            const roundLines = [];
            round.ids.forEach((matchId) => {
                if (!matchId.includes("R")) return;
                const line = formatKnockoutLineFromNode(bracket[matchId]);
                if (line) roundLines.push(`  • ${line}`);
            });
            if (roundLines.length) {
                hasRight = true;
                lines.push(`${round.label}:`);
                lines.push(...roundLines);
            }
        });
        if (!hasRight) lines.push("  (Sin predicciones en Llave B)");

        lines.push("");
        lines.push("🏁 FINAL Y TERCER PUESTO");
        ["node-1-final", "node-3-tercero"].forEach((matchId) => {
            const node = bracket[matchId];
            const line = formatKnockoutLineFromNode(node);
            const label = matchId.includes("final") ? "Gran Final" : "3er Puesto";
            if (line) lines.push(`${label}: ${line}`);
            else lines.push(`${label}: (pendiente)`);
        });

        const champ =
            data.campeon ||
            getChampionFromBracketData(bracket) ||
            "Pendiente";
        lines.push("");
        lines.push(`🥇 CAMPEÓN PREDICHO: ${champ}`);
        lines.push("");
        lines.push("══════════════════════════════════");
        lines.push("Mensaje generado automáticamente desde Prode Mundial 2026.");

        return lines.join("\n");
    }

    function compilePredictionSummaryFromData(data) {
        if (!data) return "Sin predicciones cargadas aún.";
        const parts = [];

        groupOrder.forEach((g) => {
            const cnt = matchesData.filter((m) => {
                const s = data.groupMatches?.[m.id];
                return s && (s.home !== "" || s.away !== "");
            }).length;
            if (cnt) parts.push(`Grupo ${g}: ${cnt} partido(s)`);
        });

        bracketRounds.forEach((round) => {
            const lines = round.ids
                .map((id) => formatKnockoutLineFromNode(data.bracket?.[id]))
                .filter(Boolean);
            if (lines.length) {
                parts.push(`${round.label}: ${lines.join("; ")}`);
            }
        });

        const champ = data.campeon || getChampionFromBracketData(data.bracket);
        if (champ) parts.push(`Campeón: ${champ}`);

        return parts.length ? parts.join(" / ") : "Sin predicciones cargadas aún.";
    }

    function compilePredictionSummary() {
        return compilePredictionSummaryFromData(getPredictionExportBundle(getActiveUser()));
    }

    function compileDetailedPredictionLines() {
        const lines = [];
        bracketRounds.forEach((round) => {
            round.ids.forEach((matchId) => {
                const line = formatMatchPrediction(matchId);
                if (line) lines.push({ fase: round.label, texto: line });
            });
        });
        return lines;
    }

    const ALL_KNOCKOUT_MATCH_IDS = bracketRounds.flatMap((r) => r.ids);
    const R32_IDS =
        typeof ROUND_OF_32_MATCH_IDS !== "undefined"
            ? ROUND_OF_32_MATCH_IDS
            : Object.keys(
                  typeof FIFA_ROUND_OF_32_FIXTURE !== "undefined"
                      ? FIFA_ROUND_OF_32_FIXTURE
                      : {}
              );
    const POST_R32_MATCH_IDS = ALL_KNOCKOUT_MATCH_IDS.filter((id) => !R32_IDS.includes(id));

    function compareStandingRows(a, b) {
        return (
            b.pts - a.pts ||
            b.gd - a.gd ||
            b.gf - a.gf ||
            a.team.localeCompare(b.team)
        );
    }

    function buildGroupStandingsFromPredictions() {
        const tables = {};
        groupOrder.forEach((letter) => {
            tables[letter] = {};
            groupsData[letter].forEach((team) => {
                tables[letter][team] = {
                    team,
                    group: letter,
                    pts: 0,
                    gf: 0,
                    ga: 0,
                    gd: 0,
                    played: 0
                };
            });
        });

        matchesData.forEach((match) => {
            const scores = prodeState.groupMatches[match.id];
            if (!scores) return;
            const homeScore = parseInt(String(scores.home ?? "").trim(), 10);
            const awayScore = parseInt(String(scores.away ?? "").trim(), 10);
            if (isNaN(homeScore) || isNaN(awayScore)) return;

            const homeRow = tables[match.group][match.home];
            const awayRow = tables[match.group][match.away];
            if (!homeRow || !awayRow) return;

            homeRow.played += 1;
            awayRow.played += 1;
            homeRow.gf += homeScore;
            homeRow.ga += awayScore;
            awayRow.gf += awayScore;
            awayRow.ga += homeScore;
            homeRow.gd = homeRow.gf - homeRow.ga;
            awayRow.gd = awayRow.gf - awayRow.ga;

            if (homeScore > awayScore) {
                homeRow.pts += 3;
            } else if (awayScore > homeScore) {
                awayRow.pts += 3;
            } else {
                homeRow.pts += 1;
                awayRow.pts += 1;
            }
        });

        const sortedByGroup = {};
        const completeGroups = [];
        groupOrder.forEach((letter) => {
            sortedByGroup[letter] = Object.values(tables[letter]).sort(compareStandingRows);
            if (isGroupPredictionComplete(letter)) {
                completeGroups.push(letter);
            }
        });

        return { tables, sortedByGroup, completeGroups };
    }

    function isGroupPredictionComplete(groupLetter) {
        return matchesData
            .filter((m) => m.group === groupLetter)
            .every((m) => {
                const s = prodeState.groupMatches[m.id];
                if (!s) return false;
                const h = String(s.home ?? "").trim();
                const a = String(s.away ?? "").trim();
                return h !== "" && a !== "" && !isNaN(parseInt(h, 10)) && !isNaN(parseInt(a, 10));
            });
    }

    function getTeamFromGroupStanding(sortedByGroup, groupLetter, rank) {
        const row = sortedByGroup[groupLetter]?.[rank - 1];
        return row?.team || null;
    }

    function standingsRowEqual(a, b) {
        if (!a || !b) return false;
        return a.pts === b.pts && a.gd === b.gd && a.gf === b.gf;
    }

    function getQualifiedThirdPlaceTeams(allThirds) {
        if (allThirds.length <= 8) return [...allThirds];
        const cutoff = allThirds[7];
        const qualified = allThirds.slice(0, 8);
        for (let i = 8; i < allThirds.length; i++) {
            if (standingsRowEqual(allThirds[i], cutoff)) {
                qualified.push(allThirds[i]);
            } else {
                break;
            }
        }
        return qualified;
    }

    function getThirdPlaceSlotKey(matchId, slot) {
        return `${matchId}|${slot}`;
    }

    function getThirdPlacePoolForSlot(matchId, slot) {
        const spec =
            typeof FIFA_ROUND_OF_32_FIXTURE !== "undefined"
                ? FIFA_ROUND_OF_32_FIXTURE[matchId]?.[slot]
                : null;
        return spec?.thirdPool || null;
    }

    function getThirdPlaceCandidateTeams(qualified, pool, assignedTeams) {
        const assigned = assignedTeams || new Set();
        let poolRows = qualified.filter(
            (r) => pool.includes(r.group) && !assigned.has(r.team)
        );

        if (poolRows.length === 0) {
            poolRows = qualified.filter((r) => pool.includes(r.group));
        }

        if (poolRows.length === 0) return [];

        const sorted = [...poolRows].sort(compareStandingRows);
        const top = sorted[0];
        const tied = sorted.filter((r) => standingsRowEqual(r, top));
        return tied.map((r) => r.team);
    }

    function assignThirdPlaceTeamsWithMeta(sortedByGroup) {
        const assignments = {};
        const ambiguousSlots = {};

        if (groupOrder.some((g) => !isGroupPredictionComplete(g))) {
            thirdPlaceAmbiguousSlots = {};
            return { assignments, ambiguousSlots };
        }

        const allThirds = groupOrder
            .map((g) => sortedByGroup[g][2])
            .filter(Boolean)
            .sort(compareStandingRows);

        const qualified = getQualifiedThirdPlaceTeams(allThirds);
        const slotOrder =
            typeof FIFA_THIRD_PLACE_SLOT_ORDER !== "undefined"
                ? FIFA_THIRD_PLACE_SLOT_ORDER
                : [];

        if (!prodeState.thirdPlacePicks) prodeState.thirdPlacePicks = {};

        slotOrder.forEach(({ matchId, slot, pool }) => {
            const key = getThirdPlaceSlotKey(matchId, slot);
            const pick = prodeState.thirdPlacePicks[key];
            if (
                pick &&
                qualified.some((r) => r.team === pick && pool.includes(r.group))
            ) {
                assignments[key] = pick;
            } else if (pick) {
                delete prodeState.thirdPlacePicks[key];
            }
        });

        let remaining = qualified.filter(
            (r) => !Object.values(assignments).includes(r.team)
        );

        slotOrder.forEach(({ matchId, slot, pool }) => {
            const key = getThirdPlaceSlotKey(matchId, slot);
            if (assignments[key]) return;

            const eligible = remaining.filter((r) => pool.includes(r.group));

            if (eligible.length === 1) {
                assignments[key] = eligible[0].team;
                remaining = remaining.filter((r) => r.team !== eligible[0].team);
                return;
            }

            if (eligible.length > 1) {
                const top = eligible[0];
                const tied = eligible.filter((r) => standingsRowEqual(r, top));
                if (tied.length === 1) {
                    assignments[key] = tied[0].team;
                    remaining = remaining.filter((r) => r.team !== tied[0].team);
                } else {
                    ambiguousSlots[key] = tied.map((r) => r.team);
                }
            }
        });

        slotOrder.forEach(({ matchId, slot, pool }) => {
            const key = getThirdPlaceSlotKey(matchId, slot);
            if (assignments[key] || ambiguousSlots[key]?.length) return;

            const assignedTeams = new Set(Object.values(assignments));
            let candidates = getThirdPlaceCandidateTeams(
                qualified,
                pool,
                assignedTeams
            );

            if (candidates.length === 0) {
                candidates = qualified
                    .filter((r) => pool.includes(r.group))
                    .map((r) => r.team);
            }

            if (candidates.length === 1 && !assignedTeams.has(candidates[0])) {
                assignments[key] = candidates[0];
                remaining = remaining.filter((r) => r.team !== candidates[0]);
            } else if (candidates.length === 1 && assignedTeams.has(candidates[0])) {
                ambiguousSlots[key] = qualified
                    .filter((r) => pool.includes(r.group))
                    .map((r) => r.team);
            } else if (candidates.length > 1) {
                ambiguousSlots[key] = candidates;
            } else if (qualified.length > 0) {
                ambiguousSlots[key] = qualified.map((r) => r.team);
            }
        });

        thirdPlaceAmbiguousSlots = ambiguousSlots;
        return { assignments, ambiguousSlots };
    }

    function getLiveThirdPlaceCandidates(matchId, slot) {
        const pool = getThirdPlacePoolForSlot(matchId, slot);
        if (!pool) return [];

        const key = getThirdPlaceSlotKey(matchId, slot);
        if (thirdPlaceAmbiguousSlots[key]?.length) {
            return thirdPlaceAmbiguousSlots[key];
        }

        if (groupOrder.some((g) => !isGroupPredictionComplete(g))) return [];

        const { sortedByGroup } = buildGroupStandingsFromPredictions();
        const allThirds = groupOrder
            .map((g) => sortedByGroup[g][2])
            .filter(Boolean)
            .sort(compareStandingRows);
        const qualified = getQualifiedThirdPlaceTeams(allThirds);
        const { assignments, ambiguousSlots } =
            assignThirdPlaceTeamsWithMeta(sortedByGroup);

        if (ambiguousSlots[key]?.length) return ambiguousSlots[key];

        const otherAssigned = new Set(
            Object.entries(assignments)
                .filter(([k]) => k !== key)
                .map(([, team]) => team)
        );

        let candidates = getThirdPlaceCandidateTeams(
            qualified,
            pool,
            otherAssigned
        );

        if (!candidates.length) {
            candidates = qualified
                .filter((r) => pool.includes(r.group))
                .map((r) => r.team);
        }

        return candidates.length ? candidates : qualified.map((r) => r.team);
    }

    function resolveRoundOf32Teams(sortedByGroup, thirdAssignments) {
        const fixture =
            typeof FIFA_ROUND_OF_32_FIXTURE !== "undefined"
                ? FIFA_ROUND_OF_32_FIXTURE
                : {};
        const teams = {};

        Object.entries(fixture).forEach(([matchId, slots]) => {
            teams[matchId] = { home: null, away: null };

            ["home", "away"].forEach((side) => {
                const spec = slots[side];
                if (!spec) return;

                if (spec.rank && spec.group) {
                    if (!isGroupPredictionComplete(spec.group)) return;
                    teams[matchId][side] = getTeamFromGroupStanding(
                        sortedByGroup,
                        spec.group,
                        spec.rank
                    );
                } else if (spec.thirdPool) {
                    teams[matchId][side] = thirdAssignments[`${matchId}|${side}`] || null;
                }
            });
        });

        return teams;
    }

    function clearKnockoutFromOctavos() {
        POST_R32_MATCH_IDS.forEach((matchId) => {
            setSlotData(matchId, "home", null);
            setSlotData(matchId, "away", null);
            const inputH = document.getElementById(`input-${matchId}-home`);
            const inputA = document.getElementById(`input-${matchId}-away`);
            if (inputH) inputH.value = "";
            if (inputA) inputA.value = "";
            if (prodeState.bracket[matchId]) {
                prodeState.bracket[matchId].scoreHome = "";
                prodeState.bracket[matchId].scoreAway = "";
            }
        });
    }

    function setBracketSlotLabel(matchId, slot, labelText) {
        const el = document.querySelector(
            `.team-selector[data-match="${matchId}"][data-slot="${slot}"]`
        );
        if (!el) return;
        let badge = el.querySelector(".bracket-slot-badge");
        if (!labelText) {
            if (badge) badge.remove();
            return;
        }
        if (!badge) {
            badge = document.createElement("span");
            badge.className = "bracket-slot-badge";
            el.appendChild(badge);
        }
        badge.textContent = labelText;
    }

    function applyRoundOf32Labels() {
        const fixture =
            typeof FIFA_ROUND_OF_32_FIXTURE !== "undefined"
                ? FIFA_ROUND_OF_32_FIXTURE
                : {};
        Object.entries(fixture).forEach(([matchId, slots]) => {
            ["home", "away"].forEach((side) => {
                const spec = slots[side];
                if (!spec) return;
                if (spec.rank && spec.group) {
                    setBracketSlotLabel(matchId, side, `${spec.rank}${spec.group}`);
                } else if (spec.thirdPool) {
                    setBracketSlotLabel(matchId, side, `3º ${spec.thirdPool.join("")}`);
                }
            });
        });
    }

    function updateBracketAutoStatus(completeGroups) {
        const el = document.getElementById("bracket-auto-status");
        const countEl = document.getElementById("group-progress-count");
        const chipsEl = document.getElementById("group-progress-chips");
        if (!el) return;

        const total = groupOrder.length;
        const done = completeGroups.length;
        const msgEl = el.querySelector(".group-progress-msg");

        if (countEl) countEl.textContent = `${done}/${total}`;

        if (chipsEl) {
            chipsEl.innerHTML = groupOrder
                .map(
                    (g) =>
                        `<span class="group-progress-chip${completeGroups.includes(g) ? " is-done" : ""}" title="Grupo ${g}">${g}</span>`
                )
                .join("");
        }

        el.classList.toggle("is-complete", done === total);

        if (!msgEl) return;

        if (done === 0) {
            msgEl.textContent =
                "Completá los resultados de cada grupo: los 1º y 2º entran al cuadro en vivo. Los 8 mejores terceros se asignan cuando los 12 grupos estén listos.";
        } else if (done < total) {
            msgEl.textContent = `Tenés ${done} de ${total} grupos completos. Los clasificados de esos grupos ya están en los 16avos. Cuando cierres los ${total - done} restantes, se definirán los 8 mejores terceros. Podés cargar goles en la eliminatoria en cualquier momento.`;
        } else {
            const pendingThirds = (typeof FIFA_THIRD_PLACE_SLOT_ORDER !== "undefined"
                ? FIFA_THIRD_PLACE_SLOT_ORDER
                : []
            ).filter(({ matchId, slot }) => isThirdPlaceManualSlot(matchId, slot)).length;
            if (pendingThirds > 0) {
                msgEl.textContent = `Fase de grupos completa. Hay ${pendingThirds} cruce(s) de mejores terceros pendientes: hacé clic en las casillas marcadas en amarillo para elegir tu predicción.`;
            } else {
                msgEl.textContent =
                    "¡Fase de grupos completa! Los 16avos están armados con los 8 mejores terceros. Solo ingresá goles: los ganadores avanzan solos a octavos, cuartos, semis y final.";
            }
        }
    }

    function syncKnockoutFromGroupStage() {
        if (!R32_IDS.length) return;

        const { sortedByGroup, completeGroups } = buildGroupStandingsFromPredictions();
        const { assignments: thirdAssignments } =
            assignThirdPlaceTeamsWithMeta(sortedByGroup);
        const r32Teams = resolveRoundOf32Teams(sortedByGroup, thirdAssignments);

        skipBracketAdvance = true;
        clearKnockoutFromOctavos();

        R32_IDS.forEach((matchId) => {
            const pair = r32Teams[matchId] || { home: null, away: null };
            setSlotData(matchId, "home", pair.home);
            setSlotData(matchId, "away", pair.away);
        });

        applyRoundOf32Labels();
        skipBracketAdvance = false;

        R32_IDS.forEach((matchId) => checkMatchAdvance(matchId));
        updateBracketAutoStatus(completeGroups);
        renderGroups();
        applyKnockoutTeamSlotLocks();
    }

    function onGroupStagePredictionUpdate() {
        if (isProdeLockedForCurrentUser()) return;
        syncGroupMatchesFromDOM();
        syncKnockoutFromGroupStage();
        updateFinalizeButtonState();
    }

    function isBracketSlotEmpty(matchId, slot) {
        const name = document
            .getElementById(`name-${matchId}-${slot}`)
            ?.textContent?.trim();
        return !name || name === "[ ? ]";
    }

    function isThirdPlaceManualSlot(matchId, slot) {
        if (!getThirdPlacePoolForSlot(matchId, slot)) return false;
        if (groupOrder.some((g) => !isGroupPredictionComplete(g))) return false;

        const key = getThirdPlaceSlotKey(matchId, slot);
        const candidates = thirdPlaceAmbiguousSlots[key];
        if (Array.isArray(candidates) && candidates.length > 0) return true;

        return isBracketSlotEmpty(matchId, slot);
    }

    function isKnockoutTeamSlotLocked(matchId, slot) {
        if (isThirdPlaceManualSlot(matchId, slot)) return false;
        return ALL_KNOCKOUT_MATCH_IDS.includes(matchId);
    }

    function applyKnockoutTeamSlotLocks() {
        document.querySelectorAll(".team-selector").forEach((el) => {
            const matchId = el.getAttribute("data-match");
            const slot = el.getAttribute("data-slot");
            el.classList.remove("team-selector--locked", "team-selector--manual-third");

            if (isThirdPlaceManualSlot(matchId, slot)) {
                el.classList.add("team-selector--manual-third");
                el.setAttribute(
                    "title",
                    "Empate entre mejores terceros: elegí qué país clasifica en este cruce"
                );
                return;
            }

            if (isKnockoutTeamSlotLocked(matchId, slot)) {
                el.classList.add("team-selector--locked");
                el.setAttribute(
                    "title",
                    "Este equipo se define automáticamente según tus predicciones"
                );
            } else {
                el.removeAttribute("title");
            }
        });
    }

    function normalizeTeamName(name) {
        return (name || "").trim();
    }

    function isPlaceholderTeam(name) {
        return !name || name === "[ ? ]";
    }

    function getMatchWinner(home, away, scoreH, scoreA) {
        if (isPlaceholderTeam(home) || isPlaceholderTeam(away)) return null;
        const h = parseInt(scoreH, 10);
        const a = parseInt(scoreA, 10);
        if (isNaN(h) || isNaN(a)) return null;
        if (h > a) return home;
        if (a > h) return away;
        return null;
    }

    function scoreParticipantPrediction(participant, realResults) {
        let points = 0;
        const hits = [];
        const bracketPred = participant.bracket || {};
        const bracketReal = realResults?.bracket || {};

        ALL_KNOCKOUT_MATCH_IDS.forEach((matchId) => {
            const pred = bracketPred[matchId];
            const real = bracketReal[matchId];
            if (!pred || !real) return;
            if (
                isPlaceholderTeam(pred.homeTeam) ||
                isPlaceholderTeam(pred.awayTeam) ||
                isPlaceholderTeam(real.homeTeam) ||
                isPlaceholderTeam(real.awayTeam)
            ) {
                return;
            }

            const predH = String(pred.homeScore ?? "").trim();
            const predA = String(pred.awayScore ?? "").trim();
            const realH = String(real.homeScore ?? "").trim();
            const realA = String(real.awayScore ?? "").trim();

            if (predH === "" || predA === "" || realH === "" || realA === "") return;

            if (predH === realH && predA === realA) {
                points += 3;
                hits.push({ type: "exacto", matchId, label: `${pred.homeTeam} ${predH}-${predA} ${pred.awayTeam}` });
                return;
            }

            const predWinner = getMatchWinner(pred.homeTeam, pred.awayTeam, predH, predA);
            const realWinner = getMatchWinner(real.homeTeam, real.awayTeam, realH, realA);
            if (predWinner && realWinner && predWinner === realWinner) {
                points += 1;
                hits.push({
                    type: "clasificado",
                    matchId,
                    label: `${realWinner} (clasificó en ${matchId.replace("node-", "")})`
                });
            }
        });

        const predChamp =
            normalizeTeamName(participant.campeon) ||
            normalizeTeamName(getChampionFromBracketData(bracketPred));
        const realChamp = normalizeTeamName(realResults?.campeon);

        if (predChamp && realChamp && predChamp === realChamp) {
            points += 2;
            hits.push({ type: "campeon", label: predChamp });
        }

        const groupPred = participant.groupMatches || {};
        const groupReal = realResults?.groupMatches || {};
        matchesData.forEach((m) => {
            const matchKey = String(m.id);
            const pred = groupPred[matchKey] || groupPred[m.id];
            const real = groupReal[matchKey] || groupReal[m.id];
            if (!pred || !real) return;

            const predH = String(pred.home ?? "").trim();
            const predA = String(pred.away ?? "").trim();
            const realH = String(real.home ?? "").trim();
            const realA = String(real.away ?? "").trim();

            if (predH === "" || predA === "" || realH === "" || realA === "") return;

            if (predH === realH && predA === realA) {
                points += 3;
                hits.push({
                    type: "exacto",
                    matchId: `group-${matchKey}`,
                    label: `Grupo ${m.group}: ${m.home} ${predH}-${predA} ${m.away}`
                });
            }
        });

        return { points, hits };
    }

    function getRealResults() {
        if (typeof ProdeDB !== "undefined") {
            const published = ProdeDB.getPublishedResults();
            if (
                Object.keys(published.bracket || {}).length > 0 ||
                Object.keys(published.groupMatches || {}).length > 0 ||
                published.campeon
            ) {
                return published;
            }
        }
        return typeof resultados_reales !== "undefined"
            ? resultados_reales
            : { bracket: {}, campeon: null, groupMatches: {} };
    }

    function evaluateGroupMatch(pred, real) {
        if (!pred || !real) return "pending";
        const predH = String(pred.home ?? "").trim();
        const predA = String(pred.away ?? "").trim();
        const realH = String(real.home ?? "").trim();
        const realA = String(real.away ?? "").trim();
        if (realH === "" || realA === "") return "pending";
        if (predH === "" || predA === "") return "pending";
        if (predH === realH && predA === realA) return "correct";
        return "incorrect";
    }

    function evaluateKnockoutMatch(pred, real) {
        if (!pred || !real) return "pending";
        if (
            isPlaceholderTeam(pred.homeTeam) ||
            isPlaceholderTeam(pred.awayTeam) ||
            isPlaceholderTeam(real.homeTeam) ||
            isPlaceholderTeam(real.awayTeam)
        ) {
            return "pending";
        }

        const predH = String(pred.homeScore ?? "").trim();
        const predA = String(pred.awayScore ?? "").trim();
        const realH = String(real.homeScore ?? "").trim();
        const realA = String(real.awayScore ?? "").trim();

        if (predH === "" || predA === "" || realH === "" || realA === "") return "pending";

        if (predH === realH && predA === realA) return "correct";

        const predWinner = getMatchWinner(pred.homeTeam, pred.awayTeam, predH, predA);
        const realWinner = getMatchWinner(real.homeTeam, real.awayTeam, realH, realA);
        if (predWinner && realWinner && predWinner === realWinner) return "correct";

        return "incorrect";
    }

    function evaluateChampionPrediction(predChamp, realChamp) {
        const pred = normalizeTeamName(predChamp);
        const real = normalizeTeamName(realChamp);
        if (!real) return "pending";
        if (!pred) return "pending";
        return pred === real ? "correct" : "incorrect";
    }

    function verdictIconHtml(status) {
        if (status === "correct") {
            return '<span class="pred-verdict pred-verdict--ok" title="Correcto" aria-label="Correcto">✓</span>';
        }
        if (status === "incorrect") {
            return '<span class="pred-verdict pred-verdict--bad" title="Incorrecto" aria-label="Incorrecto">✗</span>';
        }
        return '<span class="pred-verdict pred-verdict--pending" title="Resultado pendiente" aria-hidden="true">·</span>';
    }

    function sidebarPredItemHtml(contentHtml, status) {
        return `<div class="sidebar-pred-item">${verdictIconHtml(status)}<div class="sidebar-pred-item__body">${contentHtml}</div></div>`;
    }

    function getParticipantStoredPrediction(participant) {
        const asUser = participantToUser(participant);
        if (asUser?.nombre) {
            const stored = loadUserPredictionWithLegacyMigration(asUser);
            if (stored) {
                return {
                    bracket: stored.bracket || {},
                    campeon: stored.campeon,
                    groupMatches: stored.groupMatches || {}
                };
            }
        }
        if (participant?.codigo) {
            const legacyKey = `prode_${participant.codigo}`;
            const raw = localStorage.getItem(legacyKey);
            if (raw) {
                try {
                    const data = JSON.parse(raw);
                    return {
                        bracket: data.bracket || {},
                        campeon: data.campeon,
                        groupMatches: data.groupMatches || {}
                    };
                } catch {
                    /* ignore */
                }
            }
        }
        return {
            bracket: participant.bracket || {},
            campeon: participant.campeon,
            groupMatches: participant.groupMatches || {}
        };
    }

    function submissionToParticipant(sub) {
        const { nombre, apellido } = ProdeDB.splitFullName(sub.nombreCompleto);
        return {
            nombre,
            apellido,
            nombreCompleto: sub.nombreCompleto,
            codigo: sub.userId,
            bracket: sub.bracket || {},
            campeon: sub.campeon,
            groupMatches: sub.groupMatches || {},
            userId: sub.userId
        };
    }

    function getAllParticipantsForRanking() {
        const submissions =
            typeof ProdeDB !== "undefined" ? ProdeDB.getSubmissions() : [];
        const validSubs = submissions.filter((s) => !ProdeDB.isSnapshotEmpty(s));
        if (validSubs.length) {
            return validSubs.map(submissionToParticipant);
        }

        const list = Array.isArray(participantes_globales)
            ? participantes_globales.map((p) => ({ ...p }))
            : [];
        return list.map((p) => {
            const pred = getParticipantStoredPrediction(p);
            return {
                ...p,
                bracket: pred.bracket,
                campeon: pred.campeon,
                groupMatches: pred.groupMatches
            };
        });
    }

    function buildRankingRows() {
        const participants = getAllParticipantsForRanking();
        const real = typeof resultados_reales !== "undefined" ? resultados_reales : { bracket: {}, campeon: null };

        return participants
            .map((p) => {
                const { points, hits } = scoreParticipantPrediction(p, real);
                return {
                    nombre:
                        p.nombreCompleto ||
                        `${p.nombre || ""} ${p.apellido || ""}`.trim() ||
                        p.nombre ||
                        "Sin nombre",
                    codigo: p.codigo || "—",
                    points,
                    hits,
                    bracket: p.bracket,
                    campeon: p.campeon
                };
            })
            .sort((a, b) => b.points - a.points || a.nombre.localeCompare(b.nombre));
    }

    function bindRegistrationWhatsappButton(user) {
        if (!btnWhatsapp || !user) return;
        btnWhatsapp.onclick = () => {
            openWhatsappForAdmin(buildRegistrationWhatsappMessage(user));
        };
    }

    function openWhatsappForAdmin(message) {
        const phone = String(adminPhoneNumber).replace(/\D/g, "");
        const waUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
        window.open(waUrl, "_blank");
    }

    function sendProdeToWhatsapp(user) {
        if (!user?.nombre) {
            alert("Registrate y activá tu cuenta para enviar tu prode por WhatsApp.");
            return;
        }
        openWhatsappForAdmin(buildFullWhatsappProdeMessage(user));
    }

    let filterBound = false;
    let pendingRegistration = null;

    function applyPaymentConfig() {
        const payment =
            typeof PLATFORM_CONFIG !== "undefined" ? PLATFORM_CONFIG.payment : null;
        const amountEl = document.getElementById("payment-amount");
        const aliasEl = document.getElementById("payment-alias");
        if (amountEl) amountEl.textContent = payment?.amount || "$5.000";
        if (aliasEl) aliasEl.textContent = payment?.alias || "barceloclub";
    }

    function showAuthScreen(screenNum) {
        [screen1, screen2, screen3].forEach((el) => el?.classList.add("hidden"));
        if (screenNum === 1) screen1?.classList.remove("hidden");
        if (screenNum === 2) screen2?.classList.remove("hidden");
        if (screenNum === 3) screen3?.classList.remove("hidden");
    }

    function showRegisterError(msg) {
        if (!registerErrorDiv) return;
        registerErrorDiv.textContent = msg;
        registerErrorDiv.classList.toggle("hidden", !msg);
    }

    function showLoginFeedback({ error, info }) {
        if (loginErrorDiv) {
            loginErrorDiv.textContent = error || "";
            loginErrorDiv.classList.toggle("hidden", !error);
        }
        if (loginInfoDiv) {
            loginInfoDiv.textContent = info || "";
            loginInfoDiv.classList.toggle("hidden", !info);
        }
    }

    function loginSessionUser(user) {
        const previousUser = prodeState.user;
        prodeState.user = user;
        ProdeDB.setSessionUser(user);

        if (!usersSamePerson(previousUser, user)) {
            resetSessionForNewRegistration();
        }

        unlockApp();
    }

    function isProdeLockedForCurrentUser() {
        const user = getActiveUser();
        if (!user?.id) return false;
        const submission = ProdeDB.getSubmissionByUserId(user.id);
        if (!submission) return false;
        if (ProdeDB.isSnapshotEmpty(submission)) return false;
        return true;
    }

    function applyProdeLockState() {
        const locked = isProdeLockedForCurrentUser();
        document.body.classList.toggle("prode-locked", locked);

        const btnFinalize = document.getElementById("btn-finalize");
        if (btnFinalize) {
            btnFinalize.style.display = locked ? "none" : "";
        }

        document.querySelectorAll(".input-goles, .bracket-score").forEach((el) => {
            el.disabled = locked;
        });

        document.querySelectorAll(".team-selector").forEach((el) => {
            if (locked) {
                el.classList.add("team-selector--locked");
                el.setAttribute("title", "Tu prode ya fue enviado y no puede modificarse");
            }
        });

        let banner = document.getElementById("prode-locked-banner");
        if (locked && !banner) {
            banner = document.createElement("div");
            banner.id = "prode-locked-banner";
            banner.className = "prode-locked-banner";
            banner.innerHTML =
                '<strong>Prode enviado.</strong> Tu predicción está bloqueada. Podés ver tu resumen en el panel lateral.';
            const header = document.querySelector("header");
            header?.insertAdjacentElement("afterend", banner);
        } else if (!locked && banner) {
            banner.remove();
        }
    }

    applyPaymentConfig();

    if (btnGoLogin) {
        btnGoLogin.addEventListener("click", () => {
            showAuthScreen(3);
            showLoginFeedback({});
            setTimeout(() => loginNombreInput?.focus(), 80);
        });
    }

    if (btnGoRegister) {
        btnGoRegister.addEventListener("click", () => {
            showAuthScreen(1);
            showRegisterError("");
        });
    }

    if (btnAfterPaymentLogin) {
        btnAfterPaymentLogin.addEventListener("click", () => {
            showAuthScreen(3);
            if (pendingRegistration?.nombreCompleto && loginNombreInput) {
                loginNombreInput.value = pendingRegistration.nombreCompleto;
            }
            showLoginFeedback({
                info: "Cuando el administrador apruebe tu pago, podrás iniciar sesión."
            });
            setTimeout(() => loginPasswordInput?.focus(), 80);
        });
    }

    entryForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        showRegisterError("");

        const nombreCompleto = nombreCompletoInput?.value.trim();
        const password = regPasswordInput?.value || "";

        const result = await ProdeDB.registerPending({ nombreCompleto, password });
        if (!result.ok) {
            showRegisterError(result.error);
            return;
        }

        const { nombre, apellido } = ProdeDB.splitFullName(nombreCompleto);
        pendingRegistration = {
            id: result.user.id,
            nombreCompleto,
            nombre,
            apellido
        };

        if (registeredUserDisplay) {
            registeredUserDisplay.innerHTML = `Registrado como: <span class="text-white">${nombreCompleto}</span>`;
        }

        bindRegistrationWhatsappButton(pendingRegistration);
        showAuthScreen(2);
    });

    loginForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        showLoginFeedback({});

        const nombreCompleto = loginNombreInput?.value.trim();
        const password = loginPasswordInput?.value || "";
        const result = await ProdeDB.login({ nombreCompleto, password });

        if (!result.ok) {
            showLoginFeedback({
                error: result.error,
                info: result.pending
                    ? "Revisá WhatsApp: el administrador debe confirmar tu pago."
                    : ""
            });
            return;
        }

        loginSessionUser(result.user);
    });

    function bindPasswordToggles() {
        document.querySelectorAll("[data-password-toggle]").forEach((btn) => {
            const targetId = btn.getAttribute("data-target");
            if (!targetId) return;
            const input = document.getElementById(targetId);
            if (!input) return;

            const setState = (visible) => {
                btn.setAttribute("data-state", visible ? "visible" : "hidden");
                btn.setAttribute(
                    "aria-label",
                    visible ? "Ocultar contraseña" : "Mostrar contraseña"
                );
            };

            setState(false);

            btn.addEventListener("click", () => {
                const isVisible = input.getAttribute("type") === "text";
                input.setAttribute("type", isVisible ? "password" : "text");
                setState(!isVisible);
                input.focus();
            });
        });
    }

    bindPasswordToggles();

    function unlockApp() {
        document.body.classList.remove("modal-active");
        entryModal.classList.add("opacity-0", "pointer-events-none");
        setTimeout(() => { entryModal.style.display = "none"; }, 500);

        renderGroups();
        renderGroupPills();
        bindBracketEvents();

        loadPredictionForActiveUser();
        renderGroups();
        applyKnockoutTeamSlotLocks();
        applyProdeLockState();
        updateFinalizeButtonState();
        document.body.classList.add("user-logged-in");

        setTimeout(() => {
            try { setupMobileBracketTabs(); } catch (e) {/* non-fatal */}
        }, 80);
    }

    function logoutUser() {
        ProdeDB.clearSession();
        prodeState.user = null;
        location.reload();
    }

    function tryRestoreSession() {
        const session = ProdeDB.getSessionUser();
        if (session?.id && session?.nombre) {
            prodeState.user = session;
            unlockApp();
            return true;
        }
        return false;
    }

    function renderGroups() {
        const container = document.getElementById("groups-container");
        container.innerHTML = "";

        Object.keys(groupsData).forEach(group => {
            const card = document.createElement("div");
            card.className = "group-card rounded-xl p-4 relative group-card-content shadow-lg";

            let teamsHtml = "";
            const { sortedByGroup } = buildGroupStandingsFromPredictions();
            const ranked = sortedByGroup[group] || [];

            ranked.forEach((row, idx) => {
                const flag = getFlagUrl(row.team);
                teamsHtml += `
                    <div class="flex items-center justify-between py-2.5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/40 px-2 rounded transition-colors" data-group-letter="${group}" data-group-team="${row.team}">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="text-xs text-slate-500 font-bold w-5">${idx + 1}</span>
                            <div class="flag-slot-empty p-0.5 border-solid">
                                <img src="${flag}" alt="${row.team}" class="flag-icon-group" onerror="this.style.visibility='hidden'">
                            </div>
                            <span class="text-sm text-slate-100 font-bold truncate">${row.team}</span>
                        </div>
                        <span class="text-xs font-bold text-emerald-400/90 shrink-0" data-group-pts>${row.pts} pts</span>
                    </div>`;
            });

            card.innerHTML = `
                <div class="absolute -right-2 -top-2 text-7xl font-black text-white opacity-5 select-none pointer-events-none">${group}</div>
                <h3 class="text-lg font-extrabold mb-3 tracking-widest uppercase title-scoreboard">Grupo ${group}</h3>
                <div class="space-y-0.5">${teamsHtml}</div>`;
            container.appendChild(card);
        });
    }

    let activeGroupPill = "A";

    function renderGroupPills() {
        const wrap = document.getElementById("group-pills");
        if (!wrap) return;

        wrap.innerHTML = groupOrder
            .map(
                (g) =>
                    `<button type="button" class="group-pill${g === activeGroupPill ? " is-active" : ""}" data-group-pill="${g}" aria-pressed="${g === activeGroupPill}">Grupo ${g}</button>`
            )
            .join("");

        if (!filterBound) {
            filterBound = true;
            wrap.addEventListener("click", (e) => {
                const btn = e.target.closest("[data-group-pill]");
                if (!btn) return;
                activeGroupPill = btn.getAttribute("data-group-pill");
                wrap.querySelectorAll(".group-pill").forEach((el) => {
                    const on = el.getAttribute("data-group-pill") === activeGroupPill;
                    el.classList.toggle("is-active", on);
                    el.setAttribute("aria-pressed", on ? "true" : "false");
                });
                renderMatches(activeGroupPill);
            });
        }

        renderMatches(activeGroupPill);
    }

    function renderMatches(groupFilter) {
        const container = document.getElementById("matches-container");
        container.innerHTML = "";

        const filteredMatches = matchesData
            .filter(m => m.group === groupFilter)
            .sort((a, b) => {
                const dayA = parseInt(a.date, 10) || 0;
                const dayB = parseInt(b.date, 10) || 0;
                if (dayA !== dayB) return dayA - dayB;
                return a.time.localeCompare(b.time);
            });

        filteredMatches.forEach(match => {
            const saved = prodeState.groupMatches[match.id] || { home: "", away: "" };
            const homeFlag = getFlagUrl(match.home);
            const awayFlag = getFlagUrl(match.away);

            const matchEl = document.createElement("div");
            matchEl.className = "bg-slate-900/85 rounded-xl p-4 flex flex-col border border-slate-700 hover:border-emerald-500/40 transition-all shadow-md gap-2";

            matchEl.innerHTML = `
                <div class="w-full flex flex-wrap justify-center gap-2 pb-2 border-b border-slate-700/80">
                    <span class="text-xs font-black text-emerald-400 uppercase tracking-widest">${match.date}</span>
                    <span class="text-xs font-black text-slate-200">${match.time} hs</span>
                    <span class="text-xs font-bold text-slate-500">Grupo ${match.group}</span>
                </div>
                <div class="flex items-center justify-between w-full gap-3 pt-1 match-card-body">
                    <div class="flex items-center justify-end gap-3 flex-1 min-w-0">
                        <span class="text-sm font-bold text-slate-100 text-right truncate">${match.home}</span>
                        <div class="flag-slot-empty shrink-0 border-solid">
                            <img src="${homeFlag}" alt="${match.home}" class="flag-icon-lg">
                        </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <input type="number" min="0" max="15" class="input-goles match-input" data-id="${match.id}" data-type="home" value="${saved.home}" placeholder="-" aria-label="Goles ${match.home}">
                        <span class="text-slate-400 font-black text-sm">VS</span>
                        <input type="number" min="0" max="15" class="input-goles match-input" data-id="${match.id}" data-type="away" value="${saved.away}" placeholder="-" aria-label="Goles ${match.away}">
                    </div>
                    <div class="flex items-center justify-start gap-3 flex-1 min-w-0">
                        <div class="flag-slot-empty shrink-0 border-solid">
                            <img src="${awayFlag}" alt="${match.away}" class="flag-icon-lg">
                        </div>
                        <span class="text-sm font-bold text-slate-100 text-left truncate">${match.away}</span>
                    </div>
                </div>`;
            container.appendChild(matchEl);
        });

        container.querySelectorAll(".match-input").forEach((input) => {
            const syncInput = (e) => {
                const id = e.target.getAttribute("data-id");
                const type = e.target.getAttribute("data-type");
                if (!prodeState.groupMatches[id]) prodeState.groupMatches[id] = { home: "", away: "" };
                prodeState.groupMatches[id][type] = e.target.value;
                onGroupStagePredictionUpdate();
            };
            input.addEventListener("change", syncInput);
            input.addEventListener("input", syncInput);
        });
    }

    let activePopoverNodeId = null;
    let activePopoverSlot = null;
    let bracketEventsBound = false;

    const routeMap = {
        "node-16L-1": { next: "node-8L-1", slot: "home" },
        "node-16L-2": { next: "node-8L-1", slot: "away" },
        "node-16L-3": { next: "node-8L-2", slot: "home" },
        "node-16L-4": { next: "node-8L-2", slot: "away" },
        "node-16L-5": { next: "node-8L-3", slot: "home" },
        "node-16L-6": { next: "node-8L-3", slot: "away" },
        "node-16L-7": { next: "node-8L-4", slot: "home" },
        "node-16L-8": { next: "node-8L-4", slot: "away" },
        "node-8L-1": { next: "node-4L-1", slot: "home" },
        "node-8L-2": { next: "node-4L-1", slot: "away" },
        "node-8L-3": { next: "node-4L-2", slot: "home" },
        "node-8L-4": { next: "node-4L-2", slot: "away" },
        "node-4L-1": { next: "node-2L-1", slot: "home" },
        "node-4L-2": { next: "node-2L-1", slot: "away" },
        "node-2L-1": { next: "node-1-final", slot: "home", loserNext: "node-3-tercero", loserSlot: "home" },
        "node-16R-1": { next: "node-8R-1", slot: "home" },
        "node-16R-2": { next: "node-8R-1", slot: "away" },
        "node-16R-3": { next: "node-8R-2", slot: "home" },
        "node-16R-4": { next: "node-8R-2", slot: "away" },
        "node-16R-5": { next: "node-8R-3", slot: "home" },
        "node-16R-6": { next: "node-8R-3", slot: "away" },
        "node-16R-7": { next: "node-8R-4", slot: "home" },
        "node-16R-8": { next: "node-8R-4", slot: "away" },
        "node-8R-1": { next: "node-4R-1", slot: "home" },
        "node-8R-2": { next: "node-4R-1", slot: "away" },
        "node-8R-3": { next: "node-4R-2", slot: "home" },
        "node-8R-4": { next: "node-4R-2", slot: "away" },
        "node-4R-1": { next: "node-2R-1", slot: "home" },
        "node-4R-2": { next: "node-2R-1", slot: "away" },
        "node-2R-1": { next: "node-1-final", slot: "away", loserNext: "node-3-tercero", loserSlot: "away" }
    };

    function isFinalNode(matchId) {
        return matchId.includes("final") || matchId.includes("tercero");
    }

    function emptyFlagHtml(matchId) {
        const lg = isFinalNode(matchId);
        return `<div class="flag-placeholder ${lg ? "flag-placeholder-lg" : ""}"></div>`;
    }

    function setSlotData(matchId, slot, teamName) {
        if (!prodeState.bracket[matchId]) {
            prodeState.bracket[matchId] = { teamHome: null, teamAway: null, scoreHome: "", scoreAway: "" };
        }

        if (slot === "home") prodeState.bracket[matchId].teamHome = teamName;
        else prodeState.bracket[matchId].teamAway = teamName;

        const nameEl = document.getElementById(`name-${matchId}-${slot}`);
        const flagContainer = document.getElementById(`flag-${matchId}-${slot}`);

        if (teamName) {
            nameEl.textContent = teamName;
            nameEl.classList.add("text-white");
            nameEl.classList.remove("text-slate-400");
            const cls = isFinalNode(matchId) ? "flag-icon-bracket-lg" : "flag-icon-bracket";
            flagContainer.className = "flag-icon-container shrink-0";
            flagContainer.innerHTML = `<img src="${getFlagUrl(teamName)}" alt="${teamName}" class="${cls}">`;
        } else {
            nameEl.textContent = "[ ? ]";
            nameEl.classList.remove("text-white");
            nameEl.classList.add("text-slate-400");
            flagContainer.className = `flag-icon-container flag-slot-empty shrink-0${isFinalNode(matchId) ? " flag-slot-final" : ""}`;
            flagContainer.innerHTML = emptyFlagHtml(matchId);
        }

        if (!skipBracketAdvance) {
            checkMatchAdvance(matchId);
        }
    }

    function checkMatchAdvance(matchId) {
        if (!routeMap[matchId]) return;

        const state = prodeState.bracket[matchId] || {};
        const inputH = document.getElementById(`input-${matchId}-home`);
        const inputA = document.getElementById(`input-${matchId}-away`);
        const scoreH = parseInt(inputH?.value, 10);
        const scoreA = parseInt(inputA?.value, 10);

        let winner = null;
        let loser = null;

        if (!isNaN(scoreH) && !isNaN(scoreA) && state.teamHome && state.teamAway) {
            if (scoreH > scoreA) {
                winner = state.teamHome;
                loser = state.teamAway;
            } else if (scoreA > scoreH) {
                winner = state.teamAway;
                loser = state.teamHome;
            }
        }

        const route = routeMap[matchId];
        setSlotData(route.next, route.slot, winner);
        if (route.loserNext) {
            setSlotData(route.loserNext, route.loserSlot, loser);
        }
    }

    function bindBracketEvents() {
        if (bracketEventsBound) return;
        bracketEventsBound = true;

        document.querySelectorAll(".bracket-score").forEach(input => {
            input.addEventListener("input", (e) => {
                if (isProdeLockedForCurrentUser()) return;
                const matchId = e.target.getAttribute("data-match");
                const slot = e.target.getAttribute("data-slot");
                if (!prodeState.bracket[matchId]) {
                    prodeState.bracket[matchId] = { teamHome: null, teamAway: null, scoreHome: "", scoreAway: "" };
                }
                if (slot === "home") prodeState.bracket[matchId].scoreHome = e.target.value;
                else prodeState.bracket[matchId].scoreAway = e.target.value;
                checkMatchAdvance(matchId);
                updateFinalizeButtonState();
            });
        });

        document.querySelectorAll(".team-selector").forEach((el) => {
            el.addEventListener("click", (e) => {
                if (
                    el.classList.contains("team-selector--locked") &&
                    !el.classList.contains("team-selector--manual-third")
                ) {
                    e.stopPropagation();
                    return;
                }
                e.stopPropagation();
                const rect = el.getBoundingClientRect();
                activePopoverNodeId = el.getAttribute("data-match");
                activePopoverSlot = el.getAttribute("data-slot");
                openPopover(rect.bottom, rect.left);
            });
        });

        applyKnockoutTeamSlotLocks();
    }

    const popover = document.getElementById("team-popover");
    const popoverList = document.getElementById("popover-list");
    const closePopoverBtn = document.getElementById("close-popover");
    const popoverSearch = document.getElementById("popover-search");

    function populatePopoverList(filter = "") {
        popoverList.innerHTML = "";
        const f = filter.toLowerCase();

        if (activePopoverNodeId && activePopoverSlot) {
            const thirdKey = getThirdPlaceSlotKey(
                activePopoverNodeId,
                activePopoverSlot
            );
            let tiedCandidates = thirdPlaceAmbiguousSlots[thirdKey];
            if (!tiedCandidates?.length && getThirdPlacePoolForSlot(
                activePopoverNodeId,
                activePopoverSlot
            )) {
                tiedCandidates = getLiveThirdPlaceCandidates(
                    activePopoverNodeId,
                    activePopoverSlot
                );
            }

            if (tiedCandidates?.length) {
                const title = document.createElement("p");
                title.className = "text-xs text-amber-300 font-bold mb-2 px-1";
                title.textContent =
                    "Empate en mejores terceros — elegí tu predicción:";
                popoverList.appendChild(title);

                tiedCandidates.forEach((team) => {
                    if (f && !team.toLowerCase().includes(f)) return;
                    const div = document.createElement("div");
                    div.className =
                        "flex items-center gap-3 p-2.5 hover:bg-slate-800 rounded cursor-pointer transition-colors";
                    div.innerHTML = `
                        <img src="${getFlagUrl(team)}" alt="${team}" class="flag-icon-popover">
                        <span class="text-sm font-bold text-white">${team}</span>`;
                    div.addEventListener("click", () => selectTeamForNode(team));
                    popoverList.appendChild(div);
                });
                return;
            }
        }

        if (
            activePopoverNodeId &&
            activePopoverSlot &&
            isKnockoutTeamSlotLocked(activePopoverNodeId, activePopoverSlot)
        ) {
            popoverList.innerHTML =
                '<p class="text-sm text-slate-400 p-2">Los equipos de la fase eliminatoria se completan automáticamente.</p>';
            return;
        }

        const clearDiv = document.createElement("div");
        clearDiv.className = "flex items-center gap-3 p-2.5 hover:bg-slate-800 rounded cursor-pointer transition-colors mb-1";
        clearDiv.innerHTML = `<span class="text-sm font-bold text-slate-400">Deshacer · [ ? ]</span>`;
        clearDiv.addEventListener("click", () => selectTeamForNode(null));
        popoverList.appendChild(clearDiv);

        allTeamsSorted.forEach(team => {
            if (f && !team.toLowerCase().includes(f)) return;
            const div = document.createElement("div");
            div.className = "flex items-center gap-3 p-2.5 hover:bg-slate-800 rounded cursor-pointer transition-colors";
            div.innerHTML = `
                <img src="${getFlagUrl(team)}" alt="${team}" class="flag-icon-popover">
                <span class="text-sm font-bold text-white">${team}</span>`;
            div.addEventListener("click", () => selectTeamForNode(team));
            popoverList.appendChild(div);
        });
    }

    function openPopover(y, x) {
        populatePopoverList();
        popoverSearch.value = "";

        const w = 380;
        let finalX = Math.min(x, window.innerWidth - w - 16);
        let finalY = y + 10;
        if (finalY + 420 > window.innerHeight) finalY = y - 420;

        popover.style.left = `${Math.max(8, finalX)}px`;
        popover.style.top = `${Math.max(8, finalY)}px`;
        popover.classList.remove("popover-hidden");
        popover.classList.add("popover-visible");
        setTimeout(() => popoverSearch.focus(), 50);
    }

    function closePopover() {
        popover.classList.remove("popover-visible");
        popover.classList.add("popover-hidden");
        activePopoverNodeId = null;
        activePopoverSlot = null;
    }

    closePopoverBtn.addEventListener("click", closePopover);
    popoverSearch.addEventListener("input", (e) => populatePopoverList(e.target.value));

    document.addEventListener("click", (e) => {
        if (!popover.contains(e.target) && !e.target.closest(".team-selector") && popover.classList.contains("popover-visible")) {
            closePopover();
        }
    });

    function selectTeamForNode(teamName) {
        if (activePopoverNodeId && activePopoverSlot) {
            const thirdPool = getThirdPlacePoolForSlot(
                activePopoverNodeId,
                activePopoverSlot
            );

            if (thirdPool) {
                const key = getThirdPlaceSlotKey(
                    activePopoverNodeId,
                    activePopoverSlot
                );
                if (!prodeState.thirdPlacePicks) prodeState.thirdPlacePicks = {};
                if (teamName) {
                    prodeState.thirdPlacePicks[key] = teamName;
                } else {
                    delete prodeState.thirdPlacePicks[key];
                }
                syncKnockoutFromGroupStage();
                closePopover();
                return;
            }

            setSlotData(activePopoverNodeId, activePopoverSlot, teamName);
        }
        closePopover();
    }

    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const sidebarCloseBtn = document.getElementById("sidebar-close");
    const sidebarTabBtns = document.querySelectorAll("[data-sidebar-tab]");
    const sidebarPanelMine = document.getElementById("sidebar-panel-mine");
    const sidebarPanelRanking = document.getElementById("sidebar-panel-ranking");
    const sidebarPanelResults = document.getElementById("sidebar-panel-results");
    const sidebarRealResults = document.getElementById("sidebar-real-results");
    const sidebarMyPredictions = document.getElementById("sidebar-my-predictions");
    const sidebarMyChampion = document.getElementById("sidebar-my-champion");
    const sidebarUserLabel = document.getElementById("sidebar-user-label");
    const sidebarRankingWrap = document.getElementById("sidebar-ranking-wrap");
    const sidebarBtnCopyWhatsapp = document.getElementById("sidebar-btn-copy-whatsapp");

    let lastSavedSnapshot = null;
    let sidebarRefreshTimer = null;

    function getSidebarParticipantData(snapshot) {
        const user = getActiveUser();
        if (user?.id && ProdeDB.isUserProdeLocked(user.id)) {
            const submission = ProdeDB.getSubmissionByUserId(user.id);
            if (submission) {
                return {
                    user,
                    groupMatches: submission.groupMatches || {},
                    bracket: submission.bracket || {},
                    campeon: submission.campeon
                };
            }
        }
        const data = loadUserPredictionWithLegacyMigration(user) || snapshot;
        const bundle = data || getPredictionExportBundle(user);
        return {
            user: bundle?.user || user,
            groupMatches: bundle?.groupMatches || {},
            bracket: bundle?.bracket || {},
            campeon: bundle?.campeon
        };
    }

    function refreshSidebarPanels() {
        if (!sidebarOverlay?.classList.contains("is-open")) return;
        const data = getSidebarParticipantData(lastSavedSnapshot);
        renderSidebarMine(data);
        renderSidebarRanking();
        renderSidebarRealResults();
    }

    function startSidebarLiveRefresh() {
        stopSidebarLiveRefresh();
        sidebarRefreshTimer = window.setInterval(refreshSidebarPanels, 4000);
    }

    function stopSidebarLiveRefresh() {
        if (sidebarRefreshTimer) {
            window.clearInterval(sidebarRefreshTimer);
            sidebarRefreshTimer = null;
        }
    }

    function renderSidebarMine(snapshotOrData) {
        if (!sidebarMyPredictions) return;
        const data = snapshotOrData?.bracket
            ? snapshotOrData
            : getSidebarParticipantData(snapshotOrData);
        const real = getRealResults();
        const bracketData = data?.bracket || {};
        const lines = [];

        bracketRounds.forEach((round) => {
            round.ids.forEach((matchId) => {
                const node = bracketData[matchId];
                const texto = formatKnockoutLineFromNode(node);
                if (!texto) return;
                const status = evaluateKnockoutMatch(node, real.bracket?.[matchId]);
                lines.push({ fase: round.label, texto, status });
            });
        });

        let groupsHtml = "";
        const groupLines = [];
        matchesData.forEach((m) => {
            const g = data.groupMatches?.[m.id];
            if (!g || (g.home === "" && g.away === "")) return;
            const status = evaluateGroupMatch(g, real.groupMatches?.[m.id]);
            const body = `<span class="text-xs">Grupo ${m.group}: ${m.home} ${g.home || "-"}-${g.away || "-"} ${m.away}</span>`;
            groupLines.push(sidebarPredItemHtml(body, status));
        });
        if (groupLines.length) {
            groupsHtml = `<p class="sidebar-section-title">Fase de grupos</p>${groupLines.join("")}`;
        }

        if (!lines.length && !groupsHtml) {
            sidebarMyPredictions.innerHTML =
                '<p class="sidebar-pred-item text-slate-400">Aún no cargaste predicciones.</p>';
        } else {
            sidebarMyPredictions.innerHTML =
                groupsHtml +
                (lines.length
                    ? `<p class="sidebar-section-title">Eliminatoria</p>${lines
                          .map((l) =>
                              sidebarPredItemHtml(
                                  `<span class="text-emerald-400 font-bold text-xs uppercase">${l.fase}</span><br>${l.texto}`,
                                  l.status
                              )
                          )
                          .join("")}`
                    : "");
        }

        const champ =
            data?.campeon || getChampionFromBracketData(bracketData);
        const fin = bracketData["node-1-final"];
        const tercero = bracketData["node-3-tercero"];

        let champHtml = '<p class="sidebar-pred-item text-slate-400">Definí la final con goles para calcular campeón.</p>';

        if (fin && !isPlaceholderTeam(fin.homeTeam) && !isPlaceholderTeam(fin.awayTeam)) {
            const finStatus = evaluateKnockoutMatch(fin, real.bracket?.["node-1-final"]);
            const champStatus = evaluateChampionPrediction(champ, real.campeon);
            champHtml =
                sidebarPredItemHtml(
                    `<strong>Final:</strong> ${fin.homeTeam} ${fin.homeScore || "-"}-${fin.awayScore || "-"} ${fin.awayTeam}`,
                    finStatus
                ) +
                sidebarPredItemHtml(
                    `<strong class="text-yellow-400">Campeón predicho:</strong> ${champ || "Pendiente"}`,
                    champStatus
                );
        }

        if (tercero && !isPlaceholderTeam(tercero.homeTeam) && !isPlaceholderTeam(tercero.awayTeam)) {
            const terceroStatus = evaluateKnockoutMatch(tercero, real.bracket?.["node-3-tercero"]);
            champHtml += sidebarPredItemHtml(
                `<strong>3.er puesto:</strong> ${tercero.homeTeam} ${tercero.homeScore || "-"}-${tercero.awayScore || "-"} ${tercero.awayTeam}`,
                terceroStatus
            );
        }

        if (sidebarMyChampion) sidebarMyChampion.innerHTML = champHtml;

        const activeUser = data?.user || getActiveUser();
        const { points } = scoreParticipantPrediction(
            {
                bracket: bracketData,
                campeon: champ,
                groupMatches: data.groupMatches || {}
            },
            real
        );

        if (sidebarUserLabel && activeUser) {
            const ranking = buildRankingRows();
            const pos = ranking.findIndex((r) => r.codigo === activeUser.id);
            const posText = pos >= 0 ? ` · #${pos + 1} en el ranking` : "";
            sidebarUserLabel.textContent = `${activeUser.nombreCompleto || `${activeUser.nombre} ${activeUser.apellido || ""}`.trim()} · ${points} pts${posText}`;
        }
    }

    function renderSidebarRanking() {
        const ranking = buildRankingRows();
        const activeUser = getActiveUser();

        if (!sidebarRankingWrap) return;

        if (!ranking.length) {
            sidebarRankingWrap.innerHTML =
                '<p class="text-sm text-slate-400">El ranking se actualiza cuando los participantes envían su prode y el administrador publica resultados reales.</p>';
            return;
        }

        const myIdx = activeUser?.id
            ? ranking.findIndex((r) => r.codigo === activeUser.id)
            : -1;
        const positionBanner =
            myIdx >= 0
                ? `<p class="sidebar-position-banner">Tu posición actual: <strong>#${myIdx + 1}</strong> con <strong>${ranking[myIdx].points}</strong> pts</p>`
                : "";

        sidebarRankingWrap.innerHTML = `
            ${positionBanner}
            <table class="ranking-table">
                <thead>
                    <tr><th>#</th><th>Participante</th><th>Puntos</th></tr>
                </thead>
                <tbody>
                    ${ranking
                        .map(
                            (r, i) =>
                                `<tr class="${r.codigo === activeUser?.id ? "ranking-row--me" : ""}">
                                    <td>${i + 1}</td>
                                    <td>${r.nombre}${r.codigo === activeUser?.id ? ' <span class="text-emerald-400 text-xs">(vos)</span>' : ""}</td>
                                    <td><strong>${r.points}</strong></td>
                                </tr>`
                        )
                        .join("")}
                </tbody>
            </table>`;
    }

    function renderSidebarRealResults() {
        if (!sidebarRealResults) return;
        const real = getRealResults();
        const groupLines = [];
        matchesData.forEach((m) => {
            const key = String(m.id);
            const res = real.groupMatches?.[key] || real.groupMatches?.[m.id];
            if (!res) return;
            const h = String(res.home ?? "").trim();
            const a = String(res.away ?? "").trim();
            if (h === "" || a === "") return;
            groupLines.push(
                `<div class="sidebar-pred-item"><div class="sidebar-pred-item__body"><span class="text-xs">Grupo ${m.group}: ${m.home} <strong>${h}-${a}</strong> ${m.away}</span></div></div>`
            );
        });

        const koLines = [];
        bracketRounds.forEach((round) => {
            round.ids.forEach((matchId) => {
                const res = real.bracket?.[matchId];
                if (!res?.homeTeam || !res?.awayTeam) return;
                const h = String(res.homeScore ?? "").trim();
                const a = String(res.awayScore ?? "").trim();
                if (h === "" || a === "") return;
                koLines.push(
                    `<div class="sidebar-pred-item"><div class="sidebar-pred-item__body"><span class="text-emerald-400 font-bold text-xs uppercase">${round.label}</span><br>${res.homeTeam} ${h}-${a} ${res.awayTeam}</div></div>`
                );
            });
        });

        if (!groupLines.length && !koLines.length) {
            sidebarRealResults.innerHTML =
                '<p class="text-sm text-slate-400">Aún no hay resultados reales publicados por el administrador.</p>';
            return;
        }

        sidebarRealResults.innerHTML = `
            ${real.campeon ? `<p class="text-sm text-emerald-300 mb-3"><strong>Campeón oficial:</strong> ${real.campeon}</p>` : ""}
            ${groupLines.length ? `<p class="sidebar-section-title">Fase de grupos</p>${groupLines.join("")}` : ""}
            ${koLines.length ? `<p class="sidebar-section-title">Eliminatoria</p>${koLines.join("")}` : ""}`;
    }

    function switchSidebarTab(tabId) {
        sidebarTabBtns.forEach((btn) => {
            const active = btn.getAttribute("data-sidebar-tab") === tabId;
            btn.classList.toggle("is-active", active);
            btn.setAttribute("aria-selected", active ? "true" : "false");
        });
        sidebarPanelMine?.classList.toggle("is-active", tabId === "mine");
        sidebarPanelRanking?.classList.toggle("is-active", tabId === "ranking");
        sidebarPanelResults?.classList.toggle("is-active", tabId === "results");
        if (sidebarPanelMine) sidebarPanelMine.hidden = tabId !== "mine";
        if (sidebarPanelRanking) sidebarPanelRanking.hidden = tabId !== "ranking";
        if (sidebarPanelResults) sidebarPanelResults.hidden = tabId !== "results";
        if (tabId === "ranking") renderSidebarRanking();
        if (tabId === "results") renderSidebarRealResults();
        if (tabId === "mine") refreshSidebarPanels();
    }

    function openPredictionSidebar(snapshot) {
        lastSavedSnapshot =
            loadUserPredictionWithLegacyMigration(getActiveUser()) ||
            snapshot ||
            collectPredictionSnapshot();
        refreshSidebarPanels();
        renderSidebarRealResults();
        switchSidebarTab("mine");
        sidebarOverlay?.classList.add("is-open");
        sidebarOverlay?.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        startSidebarLiveRefresh();
    }

    function closePredictionSidebar() {
        stopSidebarLiveRefresh();
        sidebarOverlay?.classList.remove("is-open");
        sidebarOverlay?.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }

    sidebarTabBtns.forEach((btn) => {
        btn.addEventListener("click", () => switchSidebarTab(btn.getAttribute("data-sidebar-tab")));
    });
    sidebarCloseBtn?.addEventListener("click", closePredictionSidebar);
    sidebarOverlay?.addEventListener("click", (e) => {
        if (e.target === sidebarOverlay) closePredictionSidebar();
    });

    document.getElementById("sidebar-btn-logout")?.addEventListener("click", () => {
        if (confirm("¿Cerrar sesión? Podrás volver a entrar con tu nombre y contraseña.")) {
            logoutUser();
        }
    });

    sidebarBtnCopyWhatsapp?.addEventListener("click", () => {
        const user = lastSavedSnapshot?.user || prodeState.user;
        if (!user?.nombre) {
            alert("Registrate y activá tu cuenta para enviar el prode por WhatsApp.");
            return;
        }
        sendProdeToWhatsapp(user);
    });

    const btnCopyResumen = document.getElementById("btn-copy-resumen");
    btnCopyResumen?.addEventListener("click", () => {
        const user = prodeState.user;
        if (!user?.nombre) {
            alert("Debes registrarte para enviar tu resumen de predicciones.");
            return;
        }
        sendProdeToWhatsapp(user);
    });

    const submitConfirmOverlay = document.getElementById("submit-confirm-overlay");
    const submitConfirmMessage = document.getElementById("submit-confirm-message");
    const submitConfirmOk = document.getElementById("submit-confirm-ok");
    const submitConfirmCancel = document.getElementById("submit-confirm-cancel");
    let pendingSubmitSnapshot = null;

    function closeSubmitConfirm() {
        pendingSubmitSnapshot = null;
        submitConfirmOverlay?.classList.remove("is-open");
        submitConfirmOverlay?.setAttribute("aria-hidden", "true");
    }

    function openSubmitConfirm(snapshot, stats) {
        pendingSubmitSnapshot = snapshot;
        if (submitConfirmMessage) {
            submitConfirmMessage.innerHTML = `
                <p class="mb-3">¿Confirmás el envío de tu prode? <strong>No podrás modificarlo después.</strong></p>
                <ul class="text-left text-sm text-slate-300 space-y-1 bg-slate-900/60 rounded-lg p-3 border border-slate-700">
                    <li>✓ Fase de grupos: ${stats.filledGroups}/${stats.totalGroups} partidos</li>
                    <li>✓ Eliminatoria: ${stats.filledKo}/${stats.totalKo} partidos</li>
                    <li>✓ Campeón predicho: <strong class="text-emerald-400">${snapshot.campeon || "—"}</strong></li>
                </ul>`;
        }
        submitConfirmOverlay?.classList.add("is-open");
        submitConfirmOverlay?.setAttribute("aria-hidden", "false");
    }

    function executeProdeSubmit() {
        const snapshot = pendingSubmitSnapshot;
        const currentUser = getActiveUser();
        closeSubmitConfirm();

        if (!snapshot || !currentUser?.id) {
            alert("No se pudo enviar el prode. Volvé a iniciar sesión.");
            return;
        }

        const submitResult = ProdeDB.submitProde({
            userId: currentUser.id,
            nombreCompleto:
                currentUser.nombreCompleto ||
                `${currentUser.nombre} ${currentUser.apellido || ""}`.trim(),
            snapshot
        });

        if (!submitResult.ok) {
            alert(submitResult.error);
            return;
        }

        saveUserPrediction(snapshot);
        applyProdeLockState();
        updateFinalizeButtonState();
        openPredictionSidebar(snapshot);
        alert("¡Prode enviado! Tu predicción quedó registrada y bloqueada.");
    }

    submitConfirmOk?.addEventListener("click", executeProdeSubmit);
    submitConfirmCancel?.addEventListener("click", closeSubmitConfirm);

    const btnFinalize = document.getElementById("btn-finalize");
    if (btnFinalize) {
        btnFinalize.addEventListener("click", () => {
            const currentUser = getActiveUser();
            if (!currentUser?.nombre) {
                alert("Debés iniciar sesión para enviar tu predicción.");
                entryModal.style.display = "flex";
                document.body.classList.add("modal-active");
                showAuthScreen(3);
                return;
            }

            if (isProdeLockedForCurrentUser()) {
                alert("Ya enviaste tu prode. No podés modificarlo.");
                return;
            }

            const snapshot = collectPredictionSnapshot();
            snapshot.user = currentUser;

            const subcampeon = getBracketSlotName("node-1-final", "away");
            const tercerPuesto = getBracketSlotName("node-3-tercero", "home");
            snapshot.subcampeon =
                subcampeon && subcampeon !== "[ ? ]" ? subcampeon : null;
            snapshot.tercerPuesto =
                tercerPuesto && tercerPuesto !== "[ ? ]" ? tercerPuesto : null;

            const stats = analyzeProdeCompleteness(snapshot);

            if (stats.empty) {
                alert("No podés enviar un prode vacío. Completá tus predicciones primero.");
                return;
            }

            if (!stats.complete) {
                alert(
                    `Tu prode no está completo.\n\nFaltan ${stats.totalGroups - stats.filledGroups} partidos de grupos y ${stats.totalKo - stats.filledKo} de eliminatoria.`
                );
                return;
            }

            snapshot.isComplete = true;
            openSubmitConfirm(snapshot, stats);
        });
    }

    const btnProfileMenu = document.getElementById("btn-profile-menu");
    btnProfileMenu?.addEventListener("click", () => {
        if (!getActiveUser()?.id) {
            entryModal.style.display = "flex";
            document.body.classList.add("modal-active");
            showAuthScreen(3);
            return;
        }
        openPredictionSidebar(collectPredictionSnapshot());
    });

    // Renderizar e inicializar todo el contenido inmediatamente al cargar la página
    renderGroups();
    renderGroupPills();
    bindBracketEvents();
    syncKnockoutFromGroupStage();
    applyKnockoutTeamSlotLocks();
    updateFinalizeButtonState();

    function debounce(fn, wait) {
        let t;
        return function(...args) {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    }

    const BRACKET_MOBILE_MQ = "(max-width: 768px)";

    function clearBracketMobileVars() {
        /* Variables definidas solo en CSS móvil */
    }

    function fitBracketToViewport() {
        /* Layout móvil 100% CSS — sin transform scale ni cálculo JS */
    }

    window.addEventListener("resize", debounce(fitBracketToViewport, 120));
    window.addEventListener("orientationchange", () => setTimeout(fitBracketToViewport, 200));

    setTimeout(() => fitBracketToViewport(), 200);
    setTimeout(() => fitBracketToViewport(), 600);
    window.addEventListener("load", () => fitBracketToViewport());

    let mobileBracketTabsBound = false;

    function setupMobileBracketTabs() {
        if (mobileBracketTabsBound) return;
        const tabLeft = document.getElementById("tab-bracket-left");
        const tabRight = document.getElementById("tab-bracket-right");
        const tabsWrap = document.getElementById("mobile-bracket-tabs");
        const sideLeft = document.getElementById("bracket-side-left");
        const sideRight = document.getElementById("bracket-side-right");

        if (!tabsWrap || !tabLeft || !tabRight || !sideLeft || !sideRight) return;
        mobileBracketTabsBound = true;

        function setActiveTab(which) {
            const isA = which === "A";
            sideLeft.classList.toggle("active", isA);
            sideRight.classList.toggle("active", !isA);
            tabLeft.classList.toggle("active", isA);
            tabRight.classList.toggle("active", !isA);
            tabLeft.setAttribute("aria-selected", isA ? "true" : "false");
            tabRight.setAttribute("aria-selected", !isA ? "true" : "false");
        }

        function showLlaveA() {
            setActiveTab("A");
        }

        function showLlaveB() {
            setActiveTab("B");
        }

        tabLeft.addEventListener("click", showLlaveA);
        tabRight.addEventListener("click", showLlaveB);

        function updateBracketViewMode() {
            const isMobile = window.matchMedia(BRACKET_MOBILE_MQ).matches;
            if (isMobile) {
                tabsWrap.classList.remove("hidden");
                if (!sideLeft.classList.contains("active") && !sideRight.classList.contains("active")) {
                    showLlaveA();
                }
            } else {
                tabsWrap.classList.add("hidden");
                sideLeft.classList.add("active");
                sideRight.classList.add("active");
                tabLeft.classList.remove("active");
                tabRight.classList.remove("active");
                tabLeft.setAttribute("aria-selected", "false");
                tabRight.setAttribute("aria-selected", "false");
            }
        }

        updateBracketViewMode();
        window.addEventListener("resize", debounce(updateBracketViewMode, 120));
        window.addEventListener("orientationchange", () => setTimeout(updateBracketViewMode, 200));
    }

    setupMobileBracketTabs();

    (async () => {
        if (PLATFORM_CONFIG?.jsonbinBinId && PLATFORM_CONFIG?.jsonbinApiKey) {
            await ProdeDB.syncFromRemote();
        }
        if (!tryRestoreSession()) {
            showAuthScreen(1);
        }
    })();
});
