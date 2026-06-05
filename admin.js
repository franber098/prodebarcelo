document.addEventListener("DOMContentLoaded", () => {
    const ADMIN_SESSION = "prode_admin_session_v1";

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

    function getFlagUrl(team) {
        const code = teamFlags[team];
        return code ? `https://flagcdn.com/w40/${code}.png` : "";
    }

    function teamCellHtml(team, alignAway) {
        const flag = getFlagUrl(team);
        const img = flag
            ? `<img src="${flag}" alt="" class="admin-flag" onerror="this.style.display='none'">`
            : "";
        return `<span class="admin-team-cell${alignAway ? " admin-team-cell--away" : ""}">${alignAway ? `<span class="truncate">${team}</span>${img}` : `${img}<span class="truncate">${team}</span>`}</span>`;
    }

    const groupOrder = "ABCDEFGHIJKL".split("");
    const matchesData = [];
    let matchId = 1;
    Object.keys(groupsData).forEach((group) => {
        const teams = groupsData[group];
        const pairings = [
            { p: [0, 1] },
            { p: [2, 3] },
            { p: [0, 2] },
            { p: [1, 3] },
            { p: [0, 3] },
            { p: [1, 2] }
        ];
        pairings.forEach((pair) => {
            matchesData.push({
                id: matchId++,
                group,
                home: teams[pair.p[0]],
                away: teams[pair.p[1]]
            });
        });
    });

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
        { label: "Cuartos", ids: ["node-4L-1","node-4L-2","node-4R-1","node-4R-2"] },
        { label: "Semis", ids: ["node-2L-1","node-2R-1"] },
        { label: "Final", ids: ["node-1-final"] },
        { label: "3er Puesto", ids: ["node-3-tercero"] }
    ];

    const ALL_KNOCKOUT_MATCH_IDS = bracketRounds.flatMap((r) => r.ids);
    const R32_IDS =
        typeof ROUND_OF_32_MATCH_IDS !== "undefined"
            ? ROUND_OF_32_MATCH_IDS
            : Object.keys(FIFA_ROUND_OF_32_FIXTURE || {});
    const POST_R32_MATCH_IDS = ALL_KNOCKOUT_MATCH_IDS.filter((id) => !R32_IDS.includes(id));

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

    let masterState = {
        groupMatches: {},
        bracket: {},
        thirdPlacePicks: {},
        campeon: null,
        subcampeon: null,
        tercerPuesto: null,
        locked: { group: {}, knockout: {} }
    };

    let pendingConfirmAction = null;

    const loginEl = document.getElementById("admin-login");
    const appEl = document.getElementById("admin-app");
    const loginForm = document.getElementById("admin-login-form");
    const loginError = document.getElementById("admin-login-error");

    function isAdminLoggedIn() {
        return sessionStorage.getItem(ADMIN_SESSION) === "1";
    }

    function showAdminApp() {
        loginEl.style.display = "none";
        appEl.classList.add("is-active");
    }

    function loadMasterState() {
        const saved = ProdeDB.getMasterResults();
        masterState = {
            groupMatches: { ...(saved.groupMatches || {}) },
            bracket: { ...(saved.bracket || {}) },
            thirdPlacePicks: { ...(saved.thirdPlacePicks || {}) },
            campeon: saved.campeon || null,
            subcampeon: saved.subcampeon || null,
            tercerPuesto: saved.tercerPuesto || null,
            locked: {
                group: { ...(saved.locked?.group || {}) },
                knockout: { ...(saved.locked?.knockout || {}) }
            }
        };
    }

    function ensureLockedState() {
        if (!masterState.locked) masterState.locked = { group: {}, knockout: {} };
    }

    function persistMasterState() {
        ProdeDB.updateMasterResults(masterState);
    }

    function compareStandingRows(a, b) {
        return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team);
    }

    function standingsRowEqual(a, b) {
        return a.pts === b.pts && a.gd === b.gd && a.gf === b.gf;
    }

    function buildGroupStandings() {
        const tables = {};
        groupOrder.forEach((letter) => {
            tables[letter] = {};
            groupsData[letter].forEach((team) => {
                tables[letter][team] = { team, pts: 0, gf: 0, ga: 0, gd: 0 };
            });
        });

        matchesData.forEach((m) => {
            const key = String(m.id);
            const scores = masterState.groupMatches[key];
            if (!scores) return;
            const h = parseInt(scores.home, 10);
            const a = parseInt(scores.away, 10);
            if (isNaN(h) || isNaN(a)) return;

            const homeRow = tables[m.group][m.home];
            const awayRow = tables[m.group][m.away];
            homeRow.gf += h;
            homeRow.ga += a;
            awayRow.gf += a;
            awayRow.ga += h;
            if (h > a) {
                homeRow.pts += 3;
            } else if (a > h) {
                awayRow.pts += 3;
            } else {
                homeRow.pts += 1;
                awayRow.pts += 1;
            }
            homeRow.gd = homeRow.gf - homeRow.ga;
            awayRow.gd = awayRow.gf - awayRow.ga;
        });

        const sortedByGroup = {};
        groupOrder.forEach((g) => {
            sortedByGroup[g] = Object.values(tables[g]).sort(compareStandingRows);
        });
        return { sortedByGroup };
    }

    function isGroupComplete(letter) {
        const groupMatches = matchesData.filter((m) => m.group === letter);
        return groupMatches.every((m) => {
            const s = masterState.groupMatches[String(m.id)];
            const h = parseInt(s?.home, 10);
            const a = parseInt(s?.away, 10);
            return !isNaN(h) && !isNaN(a);
        });
    }

    function getQualifiedThirdPlaceTeams(allThirds) {
        if (allThirds.length <= 8) return [...allThirds];
        const cutoff = allThirds[7];
        const qualified = allThirds.slice(0, 8);
        for (let i = 8; i < allThirds.length; i++) {
            if (standingsRowEqual(allThirds[i], cutoff)) qualified.push(allThirds[i]);
            else break;
        }
        return qualified;
    }

    function assignThirdPlaceTeams(sortedByGroup) {
        const assignments = {};
        if (groupOrder.some((g) => !isGroupComplete(g))) return assignments;

        const allThirds = groupOrder
            .map((g) => sortedByGroup[g][2])
            .filter(Boolean)
            .sort(compareStandingRows);
        const qualified = getQualifiedThirdPlaceTeams(allThirds);
        let remaining = [...qualified];
        const slotOrder = FIFA_THIRD_PLACE_SLOT_ORDER || [];

        slotOrder.forEach(({ matchId, slot, pool }) => {
            const key = `${matchId}|${slot}`;
            const pick = masterState.thirdPlacePicks[key];
            if (pick && qualified.some((r) => r.team === pick && pool.includes(r.group))) {
                assignments[key] = pick;
                remaining = remaining.filter((r) => r.team !== pick);
            }
        });

        slotOrder.forEach(({ matchId, slot, pool }) => {
            const key = `${matchId}|${slot}`;
            if (assignments[key]) return;
            const eligible = remaining.filter((r) => pool.includes(r.group));
            if (eligible.length === 1) {
                assignments[key] = eligible[0].team;
                remaining = remaining.filter((r) => r.team !== eligible[0].team);
            } else if (eligible.length > 1) {
                const top = eligible[0];
                const tied = eligible.filter((r) => standingsRowEqual(r, top));
                if (tied.length === 1) {
                    assignments[key] = tied[0].team;
                    remaining = remaining.filter((r) => r.team !== tied[0].team);
                }
            }
        });
        return assignments;
    }

    function resolveRoundOf32(sortedByGroup, thirdAssignments) {
        const teams = {};
        Object.entries(FIFA_ROUND_OF_32_FIXTURE || {}).forEach(([matchId, slots]) => {
            teams[matchId] = { home: null, away: null };
            ["home", "away"].forEach((side) => {
                const spec = slots[side];
                if (!spec) return;
                if (spec.rank && spec.group) {
                    if (!isGroupComplete(spec.group)) return;
                    const row = sortedByGroup[spec.group][spec.rank - 1];
                    teams[matchId][side] = row?.team || null;
                } else if (spec.thirdPool) {
                    teams[matchId][side] = thirdAssignments[`${matchId}|${side}`] || null;
                }
            });
        });
        return teams;
    }

    function ensureBracketNode(matchId) {
        if (!masterState.bracket[matchId]) {
            masterState.bracket[matchId] = {
                homeTeam: null,
                awayTeam: null,
                homeScore: "",
                awayScore: ""
            };
        }
        return masterState.bracket[matchId];
    }

    function syncKnockoutFromGroups() {
        const { sortedByGroup } = buildGroupStandings();
        const thirdAssignments = assignThirdPlaceTeams(sortedByGroup);
        const r32Teams = resolveRoundOf32(sortedByGroup, thirdAssignments);

        R32_IDS.forEach((matchId) => {
            const pair = r32Teams[matchId] || { home: null, away: null };
            const node = ensureBracketNode(matchId);
            node.homeTeam = pair.home;
            node.awayTeam = pair.away;
        });

        POST_R32_MATCH_IDS.forEach((matchId) => {
            if (!R32_IDS.includes(matchId)) {
                const node = ensureBracketNode(matchId);
                if (!node.homeTeam && !node.awayTeam) {
                    node.homeTeam = null;
                    node.awayTeam = null;
                }
            }
        });

        ALL_KNOCKOUT_MATCH_IDS.forEach((id) => advanceKnockoutMatch(id));
        updateChampionsFromFinal();
    }

    function getMatchWinner(home, away, scoreH, scoreA) {
        const h = parseInt(scoreH, 10);
        const a = parseInt(scoreA, 10);
        if (!home || !away || isNaN(h) || isNaN(a)) return null;
        if (h > a) return home;
        if (a > h) return away;
        return null;
    }

    function advanceKnockoutMatch(matchId) {
        const route = routeMap[matchId];
        if (!route) return;

        const node = masterState.bracket[matchId] || {};
        const winner = getMatchWinner(
            node.homeTeam,
            node.awayTeam,
            node.homeScore,
            node.awayScore
        );
        let loser = null;
        if (winner) {
            loser = winner === node.homeTeam ? node.awayTeam : node.homeTeam;
        }

        if (route.next) {
            const next = ensureBracketNode(route.next);
            if (route.slot === "home") next.homeTeam = winner;
            else next.awayTeam = winner;
        }
        if (route.loserNext && loser) {
            const loserNode = ensureBracketNode(route.loserNext);
            if (route.loserSlot === "home") loserNode.homeTeam = loser;
            else loserNode.awayTeam = loser;
        }
    }

    function updateChampionsFromFinal() {
        const final = masterState.bracket["node-1-final"];
        const third = masterState.bracket["node-3-tercero"];
        if (final) {
            masterState.campeon = getMatchWinner(
                final.homeTeam,
                final.awayTeam,
                final.homeScore,
                final.awayScore
            );
            const h = parseInt(final.homeScore, 10);
            const a = parseInt(final.awayScore, 10);
            if (!isNaN(h) && !isNaN(a) && h !== a) {
                masterState.subcampeon =
                    h > a ? final.awayTeam : final.homeTeam;
            }
        }
        if (third) {
            masterState.tercerPuesto = getMatchWinner(
                third.homeTeam,
                third.awayTeam,
                third.homeScore,
                third.awayScore
            );
        }
    }

    function onGroupScoreChange(matchKey, side, value) {
        ensureLockedState();
        if (masterState.locked.group[matchKey]) return;
        if (!masterState.groupMatches[matchKey]) {
            masterState.groupMatches[matchKey] = { home: "", away: "" };
        }
        masterState.groupMatches[matchKey][side] = value;
        syncKnockoutFromGroups();
        renderKnockoutFixture();
    }

    function onKnockoutScoreChange(matchId, side, value) {
        ensureLockedState();
        if (masterState.locked.knockout[matchId]) return;
        const node = ensureBracketNode(matchId);
        if (side === "home") node.homeScore = value;
        else node.awayScore = value;
        ALL_KNOCKOUT_MATCH_IDS.forEach((id) => advanceKnockoutMatch(id));
        updateChampionsFromFinal();
        renderKnockoutFixture();
    }

    function publishGroupMatch(matchKey) {
        ensureLockedState();
        if (masterState.locked.group[matchKey]) return;

        const scores = masterState.groupMatches[matchKey];
        const h = parseInt(scores?.home, 10);
        const a = parseInt(scores?.away, 10);
        if (isNaN(h) || isNaN(a)) {
            alert("Completá ambos goles antes de publicar el resultado.");
            return;
        }

        openConfirm({
            title: "¿Publicar resultado?",
            message: "Este resultado se guardará y sumará puntos en los prodes. No podrás modificarlo después.",
            confirmClass: "admin-btn--approve",
            onConfirm: () => {
                masterState.locked.group[matchKey] = true;
                syncKnockoutFromGroups();
                persistMasterState();
                renderGroupsFixture();
                renderKnockoutFixture();
            }
        });
    }

    function publishKnockoutMatch(matchId) {
        ensureLockedState();
        if (masterState.locked.knockout[matchId]) return;

        const node = masterState.bracket[matchId] || {};
        const h = parseInt(node.homeScore, 10);
        const a = parseInt(node.awayScore, 10);
        if (!node.homeTeam || !node.awayTeam || node.homeTeam === "[ ? ]" || isNaN(h) || isNaN(a)) {
            alert("Completá equipos y goles antes de publicar el resultado.");
            return;
        }

        openConfirm({
            title: "¿Publicar resultado?",
            message: `¿Confirmás publicar ${node.homeTeam} ${h}-${a} ${node.awayTeam}? No podrás modificarlo después.`,
            confirmClass: "admin-btn--approve",
            onConfirm: () => {
                masterState.locked.knockout[matchId] = true;
                ALL_KNOCKOUT_MATCH_IDS.forEach((id) => advanceKnockoutMatch(id));
                updateChampionsFromFinal();
                persistMasterState();
                renderKnockoutFixture();
            }
        });
    }

    function renderGroupsFixture() {
        const wrap = document.getElementById("admin-groups-fixture");
        if (!wrap) return;
        wrap.innerHTML = "";
        ensureLockedState();

        groupOrder.forEach((group) => {
            const title = document.createElement("h3");
            title.className = "admin-round-title";
            title.textContent = `Grupo ${group}`;
            wrap.appendChild(title);

            matchesData
                .filter((m) => m.group === group)
                .forEach((m) => {
                    const key = String(m.id);
                    const saved = masterState.groupMatches[key] || { home: "", away: "" };
                    const locked = !!masterState.locked.group[key];
                    const row = document.createElement("div");
                    row.className = `admin-match-row${locked ? " is-locked" : ""}`;
                    row.innerHTML = `
                        ${teamCellHtml(m.home, true)}
                        <input type="number" min="0" max="15" value="${saved.home}" data-gmatch="${key}" data-side="home" ${locked ? "disabled" : ""}>
                        <input type="number" min="0" max="15" value="${saved.away}" data-gmatch="${key}" data-side="away" ${locked ? "disabled" : ""}>
                        ${teamCellHtml(m.away, false)}
                        ${locked
                            ? '<span class="admin-badge-published">Publicado</span>'
                            : `<button type="button" class="admin-btn admin-btn--publish" data-publish-group="${key}">Publicar</button>`}`;
                    wrap.appendChild(row);
                });
        });

        wrap.querySelectorAll("input[data-gmatch]").forEach((input) => {
            input.addEventListener("input", (e) => {
                onGroupScoreChange(
                    e.target.getAttribute("data-gmatch"),
                    e.target.getAttribute("data-side"),
                    e.target.value
                );
            });
        });

        wrap.querySelectorAll("[data-publish-group]").forEach((btn) => {
            btn.addEventListener("click", () => {
                publishGroupMatch(btn.getAttribute("data-publish-group"));
            });
        });
    }

    function renderKnockoutFixture() {
        const wrap = document.getElementById("admin-knockout-fixture");
        if (!wrap) return;
        wrap.innerHTML = "";
        ensureLockedState();

        bracketRounds.forEach((round) => {
            const title = document.createElement("h3");
            title.className = "admin-round-title";
            title.textContent = round.label;
            wrap.appendChild(title);

            round.ids.forEach((matchId) => {
                const node = masterState.bracket[matchId] || {};
                const home = node.homeTeam || "[ ? ]";
                const away = node.awayTeam || "[ ? ]";
                const locked = !!masterState.locked.knockout[matchId];
                const row = document.createElement("div");
                row.className = `admin-match-row${locked ? " is-locked" : ""}`;
                row.innerHTML = `
                    ${home !== "[ ? ]" ? teamCellHtml(home, true) : '<span class="admin-team-cell admin-team-cell--away text-slate-500">[ ? ]</span>'}
                    <input type="number" min="0" max="15" value="${node.homeScore || ""}" data-kmatch="${matchId}" data-side="home" ${locked ? "disabled" : ""}>
                    <input type="number" min="0" max="15" value="${node.awayScore || ""}" data-kmatch="${matchId}" data-side="away" ${locked ? "disabled" : ""}>
                    ${away !== "[ ? ]" ? teamCellHtml(away, false) : '<span class="admin-team-cell text-slate-500">[ ? ]</span>'}
                    ${locked
                        ? '<span class="admin-badge-published">Publicado</span>'
                        : `<button type="button" class="admin-btn admin-btn--publish" data-publish-ko="${matchId}">Publicar</button>`}`;
                wrap.appendChild(row);
            });
        });

        const published = ProdeDB.getPublishedResults();
        const champInfo = document.createElement("div");
        champInfo.className = "mt-4 text-sm text-emerald-300 space-y-1";
        champInfo.innerHTML = `
            <p><strong>Campeón publicado:</strong> ${published.campeon || "—"}</p>
            <p><strong>Subcampeón:</strong> ${published.subcampeon || "—"}</p>
            <p><strong>3er puesto:</strong> ${published.tercerPuesto || "—"}</p>`;
        wrap.appendChild(champInfo);

        wrap.querySelectorAll("input[data-kmatch]").forEach((input) => {
            input.addEventListener("input", (e) => {
                onKnockoutScoreChange(
                    e.target.getAttribute("data-kmatch"),
                    e.target.getAttribute("data-side"),
                    e.target.value
                );
            });
        });

        wrap.querySelectorAll("[data-publish-ko]").forEach((btn) => {
            btn.addEventListener("click", () => {
                publishKnockoutMatch(btn.getAttribute("data-publish-ko"));
            });
        });
    }

    function openConfirm({ title, message, confirmClass, onConfirm }) {
        document.getElementById("confirm-title").textContent = title;
        document.getElementById("confirm-message").textContent = message;
        const okBtn = document.getElementById("confirm-ok");
        okBtn.className = `admin-btn ${confirmClass || "admin-btn--approve"}`;
        pendingConfirmAction = onConfirm;
        document.getElementById("admin-confirm").classList.add("is-open");
    }

    function closeConfirm() {
        pendingConfirmAction = null;
        document.getElementById("admin-confirm").classList.remove("is-open");
    }

    function renderPendingUsers() {
        const list = document.getElementById("pending-users-list");
        const pending = ProdeDB.getPendingUsers();
        if (!pending.length) {
            list.innerHTML = '<p class="admin-empty">No hay solicitudes pendientes.</p>';
            return;
        }

        list.innerHTML = pending
            .map(
                (u) => `
            <div class="admin-user-card admin-card" data-user-id="${u.id}">
                <div>
                    <p class="font-bold text-white text-lg">${u.nombreCompleto}</p>
                    <p class="admin-user-meta">Solicitud: ${new Date(u.createdAt).toLocaleString("es-AR")}</p>
                    <p class="admin-user-meta">Contraseña (hash): <strong>${ProdeDB.maskHash(u.passwordHash)}</strong></p>
                </div>
                <div class="admin-actions">
                    <button type="button" class="admin-btn admin-btn--approve" data-action="approve" data-id="${u.id}">Aceptar</button>
                    <button type="button" class="admin-btn admin-btn--deny" data-action="deny" data-id="${u.id}">Denegar</button>
                </div>
            </div>`
            )
            .join("");

        list.querySelectorAll("[data-action]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                const user = pending.find((u) => u.id === id);
                if (!user) return;

                if (btn.getAttribute("data-action") === "approve") {
                    openConfirm({
                        title: "¿Aceptar acceso?",
                        message: `¿Confirmás que ${user.nombreCompleto} pagó la inscripción y puede ingresar a la plataforma?`,
                        confirmClass: "admin-btn--approve",
                        onConfirm: () => {
                            ProdeDB.approveUser(id);
                            renderPendingUsers();
                            renderApprovedUsers();
                        }
                    });
                } else {
                    openConfirm({
                        title: "¿Denegar acceso?",
                        message: `¿Confirmás que vas a denegar el acceso a ${user.nombreCompleto}? No podrá iniciar sesión.`,
                        confirmClass: "admin-btn--deny",
                        onConfirm: () => {
                            ProdeDB.denyUser(id);
                            renderPendingUsers();
                            renderApprovedUsers();
                        }
                    });
                }
            });
        });
    }

    function renderApprovedUsers() {
        const el = document.getElementById("approved-users-list");
        const users = ProdeDB.getApprovedUsers();
        if (!users.length) {
            el.innerHTML = '<p class="admin-empty">Aún no hay usuarios aprobados.</p>';
            return;
        }
        el.innerHTML = `<ul class="space-y-1">${users
            .map(
                (u) =>
                    `<li>✓ ${u.nombreCompleto} <span class="text-slate-500">(${new Date(u.approvedAt).toLocaleDateString("es-AR")})</span></li>`
            )
            .join("")}</ul>`;
    }

    function scoreSubmission(sub, real) {
        let points = 0;
        const bracketPred = sub.bracket || {};
        const bracketReal = real.bracket || {};

        ALL_KNOCKOUT_MATCH_IDS.forEach((matchId) => {
            const pred = bracketPred[matchId];
            const res = bracketReal[matchId];
            if (!pred || !res) return;
            const ph = String(pred.homeScore ?? "").trim();
            const pa = String(pred.awayScore ?? "").trim();
            const rh = String(res.homeScore ?? "").trim();
            const ra = String(res.awayScore ?? "").trim();
            if (!pred.homeTeam || !pred.awayTeam || !res.homeTeam || !res.awayTeam) return;
            if (!ph || !pa || !rh || !ra) return;
            if (ph === rh && pa === ra) points += 3;
            else {
                const pw = getMatchWinner(pred.homeTeam, pred.awayTeam, ph, pa);
                const rw = getMatchWinner(res.homeTeam, res.awayTeam, rh, ra);
                if (pw && rw && pw === rw) points += 1;
            }
        });

        if (sub.campeon && real.campeon && sub.campeon === real.campeon) points += 2;

        matchesData.forEach((m) => {
            const key = String(m.id);
            const pred = sub.groupMatches?.[key];
            const res = real.groupMatches?.[key];
            if (!pred || !res) return;
            const ph = String(pred.home ?? "").trim();
            const pa = String(pred.away ?? "").trim();
            const rh = String(res.home ?? "").trim();
            const ra = String(res.away ?? "").trim();
            if (ph && pa && rh && ra && ph === rh && pa === ra) points += 3;
        });

        return points;
    }

    function renderProdesTable() {
        const tbody = document.getElementById("prodes-table-body");
        const submissions = ProdeDB.getSubmissions().filter(
            (sub) => !ProdeDB.isSnapshotEmpty(sub)
        );
        const real = ProdeDB.getPublishedResults();

        const rows = submissions
            .map((sub) => ({
                ...sub,
                points: scoreSubmission(sub, real)
            }))
            .sort((a, b) => b.points - a.points || a.nombreCompleto.localeCompare(b.nombreCompleto));

        if (!rows.length) {
            tbody.innerHTML =
                '<tr><td colspan="5" class="admin-empty">Ningún usuario envió su prode aún.</td></tr>';
            return;
        }

        tbody.innerHTML = rows
            .map(
                (row, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td>${row.nombreCompleto}</td>
                <td><strong class="text-emerald-400">${row.points}</strong> pts</td>
                <td>${new Date(row.submittedAt).toLocaleString("es-AR")}</td>
                <td><button type="button" class="admin-btn admin-btn--ghost" data-view-sub="${row.id}">Ver predicción</button></td>
            </tr>`
            )
            .join("");

        tbody.querySelectorAll("[data-view-sub]").forEach((btn) => {
            btn.addEventListener("click", () => {
                const sub = rows.find((r) => r.id === btn.getAttribute("data-view-sub"));
                if (!sub) return;
                openProdeView(sub);
            });
        });
    }

    function openProdeView(sub) {
        document.getElementById("view-prode-title").textContent = sub.nombreCompleto;
        const content = document.getElementById("view-prode-content");
        const groupLines = Object.entries(sub.groupMatches || {})
            .filter(([, v]) => v?.home !== "" && v?.away !== "")
            .map(([id, v]) => `Partido ${id}: ${v.home}-${v.away}`)
            .join("\n");

        const koLines = Object.entries(sub.bracket || {})
            .filter(([, v]) => v?.homeTeam && v?.awayTeam)
            .map(
                ([id, v]) =>
                    `${id}: ${v.homeTeam} ${v.homeScore || "-"}-${v.awayScore || "-"} ${v.awayTeam}`
            )
            .join("\n");

        content.innerHTML = `
            <div><strong class="text-emerald-400">Campeón:</strong> ${sub.campeon || "—"}</div>
            <div><strong class="text-emerald-400">Subcampeón:</strong> ${sub.subcampeon || "—"}</div>
            <div><strong class="text-emerald-400">3er puesto:</strong> ${sub.tercerPuesto || "—"}</div>
            <div><strong>Fase de grupos</strong><pre>${groupLines || "Sin datos"}</pre></div>
            <div><strong>Eliminatoria</strong><pre>${koLines || "Sin datos"}</pre></div>`;
        document.getElementById("admin-view-prode").classList.add("is-open");
    }

    function switchTab(tab) {
        document.querySelectorAll("[data-admin-tab]").forEach((btn) => {
            btn.classList.toggle("is-active", btn.getAttribute("data-admin-tab") === tab);
        });
        document.querySelectorAll(".admin-tab-panel").forEach((panel) => {
            panel.classList.toggle("hidden", panel.id !== `tab-${tab}`);
        });
        if (tab === "fixture") {
            loadMasterState();
            syncKnockoutFromGroups();
            renderGroupsFixture();
            renderKnockoutFixture();
        }
        if (tab === "prodes") renderProdesTable();
        if (tab === "users") {
            renderPendingUsers();
            renderApprovedUsers();
        }
    }

    loginForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        const pass = document.getElementById("admin-password").value;
        if (pass !== PLATFORM_CONFIG.adminPassword) {
            loginError.textContent = "Contraseña incorrecta.";
            loginError.classList.remove("hidden");
            return;
        }
        loginError.classList.add("hidden");
        sessionStorage.setItem(ADMIN_SESSION, "1");
        startAdminApp();
    });

    document.getElementById("btn-admin-logout")?.addEventListener("click", () => {
        sessionStorage.removeItem(ADMIN_SESSION);
        location.reload();
    });

    document.getElementById("confirm-cancel")?.addEventListener("click", closeConfirm);
    document.getElementById("confirm-ok")?.addEventListener("click", () => {
        if (pendingConfirmAction) pendingConfirmAction();
        closeConfirm();
    });

    document.getElementById("view-prode-close")?.addEventListener("click", () => {
        document.getElementById("admin-view-prode").classList.remove("is-open");
    });

    document.querySelectorAll("[data-admin-tab]").forEach((btn) => {
        btn.addEventListener("click", () => switchTab(btn.getAttribute("data-admin-tab")));
    });

    document.getElementById("btn-export-db")?.addEventListener("click", () => {
        const blob = new Blob([ProdeDB.exportDb()], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `prode-db-${Date.now()}.json`;
        a.click();
    });

    document.getElementById("btn-import-db")?.addEventListener("click", () => {
        document.getElementById("import-db-file").click();
    });

    document.getElementById("import-db-file")?.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                ProdeDB.importDb(reader.result);
                loadMasterState();
                switchTab(document.querySelector(".admin-nav-btn.is-active")?.getAttribute("data-admin-tab") || "users");
                alert("Base de datos importada correctamente.");
            } catch {
                alert("Error al importar el archivo JSON.");
            }
        };
        reader.readAsText(file);
    });

    window.addEventListener("prode-db-updated", () => {
        if (!isAdminLoggedIn()) return;
        const active = document.querySelector(".admin-nav-btn.is-active")?.getAttribute("data-admin-tab");
        if (active === "users") {
            renderPendingUsers();
            renderApprovedUsers();
        }
        if (active === "prodes") renderProdesTable();
    });

    async function startAdminApp() {
        if (PLATFORM_CONFIG.jsonbinBinId && PLATFORM_CONFIG.jsonbinApiKey) {
            await ProdeDB.syncFromRemote();
        }
        showAdminApp();
        loadMasterState();
        switchTab("users");
        setInterval(async () => {
            if (PLATFORM_CONFIG.jsonbinBinId && PLATFORM_CONFIG.jsonbinApiKey) {
                await ProdeDB.syncFromRemote();
                const active = document.querySelector(".admin-nav-btn.is-active")?.getAttribute("data-admin-tab");
                if (active === "users") {
                    renderPendingUsers();
                    renderApprovedUsers();
                }
                if (active === "prodes") renderProdesTable();
            }
        }, 5000);
    }

    if (isAdminLoggedIn()) {
        startAdminApp();
    }
});
