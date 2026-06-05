const fs = require('fs');
const path = require('path');

const KNOCKOUT_DATES = {
    r16: '28 Jun – 3 Jul 2026',
    r8: '4 – 7 Jul 2026',
    r4: '10 – 11 Jul 2026',
    r2: '14 – 15 Jul 2026',
    third: '18 Jul 2026',
    final: '19 Jul 2026'
};

function getMatchHTML(matchId) {
    return `
                <div class="bracket-node-container p-2 flex flex-col gap-1.5 relative z-10 w-full mb-1" id="${matchId}">
                    <div class="flex items-center justify-between gap-1">
                        <div class="team-selector flex items-center gap-2 flex-1 min-w-0 p-1 rounded" data-match="${matchId}" data-slot="home">
                            <div class="flag-icon-container flag-slot-empty shrink-0" id="flag-${matchId}-home">
                                <div class="flag-placeholder"></div>
                            </div>
                            <span class="bracket-team-name text-xs font-bold text-slate-300 truncate min-w-0" id="name-${matchId}-home">[ ? ]</span>
                        </div>
                        <input type="number" min="0" max="15" class="input-goles bracket-score bracket-score-sm shrink-0" placeholder="-" data-match="${matchId}" data-slot="home" id="input-${matchId}-home">
                    </div>
                    <div class="h-px bg-slate-600 w-full"></div>
                    <div class="flex items-center justify-between gap-1">
                        <div class="team-selector flex items-center gap-2 flex-1 min-w-0 p-1 rounded" data-match="${matchId}" data-slot="away">
                            <div class="flag-icon-container flag-slot-empty shrink-0" id="flag-${matchId}-away">
                                <div class="flag-placeholder"></div>
                            </div>
                            <span class="bracket-team-name text-xs font-bold text-slate-300 truncate min-w-0" id="name-${matchId}-away">[ ? ]</span>
                        </div>
                        <input type="number" min="0" max="15" class="input-goles bracket-score bracket-score-sm shrink-0" placeholder="-" data-match="${matchId}" data-slot="away" id="input-${matchId}-away">
                    </div>
                </div>`;
}

function getFinalMatchHTML(matchId, title, dateLabel) {
    return `
            <div class="w-full mt-1">
                <h4 class="text-center text-[10px] sm:text-xs font-black text-yellow-400 uppercase tracking-widest mb-1 title-scoreboard">${title}</h4>
                <p class="bracket-phase-date text-center mb-2">${dateLabel}</p>
                <div class="bracket-node-container p-2 flex flex-col gap-1.5 border-yellow-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]" id="${matchId}">
                    <div class="flex items-center justify-between gap-2 p-2 bg-slate-900/90 rounded border border-slate-700">
                        <div class="team-selector flex items-center gap-2 flex-1 min-w-0 p-1 rounded" data-match="${matchId}" data-slot="home">
                            <div class="flag-icon-container flag-slot-empty flag-slot-final shrink-0" id="flag-${matchId}-home">
                                <div class="flag-placeholder flag-placeholder-lg"></div>
                            </div>
                            <span class="text-xs sm:text-sm font-bold text-slate-300 truncate min-w-0" id="name-${matchId}-home">[ ? ]</span>
                        </div>
                        <input type="number" min="0" max="15" class="input-goles bracket-score w-9 h-9 text-sm shrink-0" placeholder="-" data-match="${matchId}" data-slot="home" id="input-${matchId}-home">
                    </div>
                    <div class="text-center text-[10px] font-black text-slate-500">VS</div>
                    <div class="flex items-center justify-between gap-2 p-2 bg-slate-900/90 rounded border border-slate-700">
                        <div class="team-selector flex items-center gap-2 flex-1 min-w-0 p-1 rounded" data-match="${matchId}" data-slot="away">
                            <div class="flag-icon-container flag-slot-empty flag-slot-final shrink-0" id="flag-${matchId}-away">
                                <div class="flag-placeholder flag-placeholder-lg"></div>
                            </div>
                            <span class="text-xs sm:text-sm font-bold text-slate-300 truncate min-w-0" id="name-${matchId}-away">[ ? ]</span>
                        </div>
                        <input type="number" min="0" max="15" class="input-goles bracket-score w-9 h-9 text-sm shrink-0" placeholder="-" data-match="${matchId}" data-slot="away" id="input-${matchId}-away">
                    </div>
                </div>
            </div>`;
}

function getColumn(roundId, name, dateLabel, matchCount) {
    let html = `
            <div class="bracket-column flex flex-col justify-around py-1 gap-1">
                <div class="bracket-column-header text-center mb-1">
                    <h4 class="bracket-round-title font-black uppercase tracking-wide title-scoreboard">${name}</h4>
                    <p class="bracket-phase-date">${dateLabel}</p>
                </div>
                <div class="bracket-matches flex flex-col justify-around flex-1 gap-0.5">`;
    for (let i = 1; i <= matchCount; i++) {
        html += getMatchHTML(`node-${roundId}-${i}`);
    }
    html += `
                </div>
            </div>`;
    return html;
}

const leftSide = `
        <div class="bracket-half bracket-half-left flex flex-row gap-1 flex-1 min-w-0">
${getColumn('16L', '16avos', KNOCKOUT_DATES.r16, 8)}
${getColumn('8L', 'Octavos', KNOCKOUT_DATES.r8, 4)}
${getColumn('4L', 'Cuartos', KNOCKOUT_DATES.r4, 2)}
${getColumn('2L', 'Semifinal', KNOCKOUT_DATES.r2, 1)}
        </div>`;

const rightSide = `
        <div class="bracket-half bracket-half-right flex flex-row-reverse gap-1 flex-1 min-w-0">
${getColumn('16R', '16avos', KNOCKOUT_DATES.r16, 8)}
${getColumn('8R', 'Octavos', KNOCKOUT_DATES.r8, 4)}
${getColumn('4R', 'Cuartos', KNOCKOUT_DATES.r4, 2)}
${getColumn('2R', 'Semifinal', KNOCKOUT_DATES.r2, 1)}
        </div>`;

const center = `
        <div class="bracket-center-column flex flex-col items-center justify-center gap-2 shrink-0">
            <img src="copadelmundo.png" alt="Copa del Mundo" class="mx-auto my-2 w-24 h-auto">
${getFinalMatchHTML('node-1-final', 'GRAN FINAL', KNOCKOUT_DATES.final)}
${getFinalMatchHTML('node-3-tercero', 'TERCER PUESTO', KNOCKOUT_DATES.third)}
        </div>`;

const fullHTML = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PRODE Mundial 2026</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="style.css">
</head>
<body class="modal-active">

    <div id="entry-modal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md transition-opacity duration-500">
        <div class="glass-panel p-8 rounded-2xl max-w-lg w-full mx-4 border-t-4 border-t-emerald-500 relative overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
            <div class="text-center mb-6 relative z-10">
                <h2 class="text-4xl sm:text-5xl font-extrabold mb-2 title-scoreboard tracking-tight">PRODE 2026</h2>
                <p class="text-slate-300 text-sm font-semibold">Mundial FIFA · USA · México · Canadá</p>
            </div>
            
            <!-- PANTALLA 1: REGISTRO INICIAL -->
            <div id="screen-1" class="relative z-10">
                <form id="entry-form" class="space-y-4">
                    <div class="bg-slate-900/60 border border-slate-700/50 rounded-xl p-6 shadow-inner">
                        <p class="text-slate-300 text-sm font-medium leading-relaxed text-center mb-5">
                            Bienvenido al PRODE Mundial 2026. Completa el formulario y confirma tu método de pago para desbloquear tu predicción.
                        </p>
                        <div class="space-y-4">
                            <div>
                                <label for="nombre" class="block text-xs font-bold text-slate-400 mb-1">Nombre <span class="text-red-400">*</span></label>
                                <input type="text" id="nombre" required placeholder="Ej: Lionel" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all">
                            </div>
                            <div>
                                <label for="apellido" class="block text-xs font-bold text-slate-400 mb-1">Apellido <span class="text-red-400">*</span></label>
                                <input type="text" id="apellido" required placeholder="Ej: Messi" class="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all">
                            </div>
                        </div>
                    </div>
                    <button type="submit" id="btn-continue" class="w-full bg-gradient-to-r from-green-600 to-[#39FF14] hover:from-green-500 hover:to-[#4dff2a] text-black font-black py-4 px-4 rounded-lg transition-all shadow-lg text-lg">
                        Registrarme y Ver Datos de Pago
                    </button>
                    <div class="text-center mt-3">
                        <button type="button" id="btn-already-registered" class="text-emerald-400 hover:text-emerald-300 font-bold text-sm transition-colors focus:outline-none">
                            Ya estoy registrado, ingresar al Prode &rarr;
                        </button>
                    </div>
                </form>
            </div>

            <!-- PANTALLA 2: DATOS DE TRANSFERENCIA Y VERIFICACIÓN -->
            <div id="screen-2" class="hidden relative z-10 space-y-4">
                <div class="bg-slate-900/60 border border-slate-700/50 rounded-xl p-6 shadow-inner text-center">
                    <div class="mb-4">
                        <span id="user-code-display" class="block text-xl sm:text-2xl font-black text-emerald-400 tracking-wide uppercase">TU CÓDIGO DE USUARIO: BRC-XXXX</span>
                        <span class="block text-xs text-slate-400 mt-1 font-semibold">Incluí este código en la referencia de la transferencia</span>
                    </div>
                    <div class="h-px bg-slate-700/50 my-4"></div>
                    <div class="space-y-2 text-left bg-slate-950/60 p-4 rounded-lg border border-slate-800">
                        <div class="flex justify-between items-center text-sm">
                            <span class="font-bold text-slate-400">ALIAS:</span>
                            <span class="font-black text-white selection:bg-emerald-500">prode.mundial.2026</span>
                        </div>
                        <div class="flex justify-between items-center text-sm">
                            <span class="font-bold text-slate-400">CBU:</span>
                            <span class="font-black text-white selection:bg-emerald-500 font-mono">0000003100012345678901</span>
                        </div>
                    </div>
                    <div class="h-px bg-slate-700/50 my-4"></div>
                    <p id="registered-user-display" class="text-sm font-bold text-slate-300">
                        Registrado como: <span class="text-white">Nombre Apellido</span>
                    </p>
                </div>
                <button type="button" id="btn-whatsapp" class="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-black py-4 px-4 rounded-lg transition-all shadow-lg text-lg flex items-center justify-center gap-2">
                    <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.86.002-2.636-1.023-5.113-2.887-6.978C16.584 1.895 14.11 .87 11.487.87c-5.448 0-9.882 4.43-9.886 9.87-.001 1.728.455 3.418 1.32 4.904l-.997 3.638 3.723-.976zm12.355-6.527c-.313-.156-1.854-.915-2.132-1.016-.277-.1-.48-.15-.68.15-.2.3-.775.98-.95 1.18-.175.2-.35.225-.663.07-.312-.156-1.32-.486-2.515-1.55-.93-.83-1.557-1.853-1.74-2.16-.183-.309-.02-.477.136-.633.14-.14.313-.365.47-.55.156-.185.207-.315.313-.525.105-.21.053-.395-.027-.55-.08-.156-.68-1.64-.93-2.245-.244-.59-.493-.51-.68-.52-.176-.01-.377-.01-.577-.01-.2 0-.527.075-.803.375-.276.3-.1.58-.1.58-.9 1.155-.775 2.53-.4 3.01.375.48 2.4 3.666 5.81 5.136.812.35 1.446.56 1.94.717.815.26 1.557.223 2.14.136.65-.097 1.854-.758 2.115-1.453.26-.694.26-1.288.182-1.411-.077-.123-.277-.198-.59-.356z"/>
                    </svg>
                    Enviar Comprobante de Pago
                </button>
                <button type="button" id="btn-finish-payment" class="w-full text-slate-400 hover:text-white font-bold py-2 text-center text-sm transition-colors mt-2 flex items-center justify-center gap-1">
                    Ya realicé el pago, ingresar al Prode &rarr;
                </button>
            </div>

    <div id="app-content" class="min-h-screen flex flex-col">
        <header class="pt-10 pb-6 flex flex-col items-center justify-center relative z-10 px-4">
            <img src="logomundial2026.png" alt="Mundial FIFA 2026" class="h-28 sm:h-32 object-contain mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.25)]">
            <h1 class="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter text-center uppercase title-scoreboard">PRODE MUNDIAL 2026</h1>
            <p class="text-slate-200/90 mt-3 text-sm sm:text-base font-semibold text-center">Predice · Compite · Gana</p>
        </header>

        <section class="container mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 z-10 relative">
            <div class="lg:col-span-5 flex flex-col space-y-4">
                <div class="mb-2 pb-2 border-b-2 border-slate-600/50">
                    <h2 class="text-2xl sm:text-3xl font-black uppercase tracking-wider title-scoreboard">Fase de Grupos</h2>
                </div>
                <div id="groups-container" class="glass-panel rounded-2xl p-4 overflow-y-auto max-h-[800px] space-y-4"></div>
            </div>
            <div class="lg:col-span-7 flex flex-col space-y-4">
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 pb-2 border-b-2 border-slate-600/50 gap-4">
                    <h2 class="text-2xl sm:text-3xl font-black uppercase tracking-wider title-scoreboard">Calendario Oficial</h2>
                    <div class="relative">
                        <select id="group-filter" class="appearance-none bg-slate-800/90 border border-slate-600 text-white font-bold rounded-lg pl-4 pr-10 py-2 outline-none focus:border-emerald-500 cursor-pointer" aria-label="Filtrar por grupo"></select>
                        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                            <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>
                <div class="glass-panel rounded-2xl p-2 overflow-hidden min-h-[400px] lg:h-[800px] flex flex-col">
                    <div id="matches-container" class="overflow-y-auto p-4 space-y-3 h-full scroll-smooth"></div>
                </div>
            </div>
        </section>

        <section id="fase-eliminatoria" class="w-full glass-panel border-t-4 border-slate-600/50 relative z-10 py-12 sm:py-16 mt-2 rounded-t-[2rem]">
            <div class="px-4 mb-8 text-center">
                <h2 class="text-3xl sm:text-5xl font-black mb-3 uppercase tracking-widest title-scoreboard">Fase Eliminatoria</h2>
                <p class="text-slate-200 mt-2 max-w-3xl mx-auto text-sm sm:text-base font-semibold leading-relaxed">
                    Haz clic en <strong class="text-white">[ ? ]</strong> para elegir entre 48 selecciones. Los goles definen al ganador y lo arrastran a la siguiente fase.
                </p>
            </div>
            <div id="bracket-eliminatoria-wrapper" class="bracket-eliminatoria-wrapper">
                <div id="bracket-container" class="bracket-container">
${leftSide}
${center}
${rightSide}
                </div>
            </div>
        </section>

        <footer class="py-14 flex flex-col items-center text-center z-20 relative bg-black/50 mt-auto">
            <button type="button" id="btn-finalize" class="btn-finalize font-black text-xl sm:text-2xl py-5 px-10 sm:px-16 rounded-full uppercase tracking-wider mb-6 flex items-center justify-center gap-3">
                <svg class="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Finalizar Predicción
            </button>
            <p class="text-slate-500 text-sm font-medium">&copy; 2026 PRODE Mundial. Todos los derechos reservados.</p>
        </footer>
    </div>

    <div id="team-popover" class="fixed z-[90] popover-hidden bg-slate-900/95 backdrop-blur-xl border border-slate-600 rounded-xl shadow-2xl w-[min(380px,92vw)] p-4 transition-all duration-200">
        <div class="flex justify-between items-center mb-3 pb-2 border-b border-slate-700">
            <h3 class="font-bold text-sm text-white">Seleccionar Equipo (48)</h3>
            <button type="button" id="close-popover" class="text-slate-400 hover:text-white transition-colors" aria-label="Cerrar">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
        <input type="text" id="popover-search" placeholder="Buscar país..." class="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-3 py-2 mb-3 outline-none focus:border-emerald-500">
        <div id="popover-list" class="max-h-[320px] overflow-y-auto pr-1 space-y-1"></div>
    </div>

    <script src="app.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'index.html'), fullHTML);
console.log('index.html definitivo generado correctamente.');
