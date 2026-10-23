'use strict';
// ============================================================
//  Ley de Boyle-Mariotte — práctica de laboratorio simulada
//  Aire encerrado en una jeringa, conectada por una llave de
//  tres vías a un manómetro. Se cambia el volumen sin cambiar
//  la temperatura y se comprueba que P·V es constante.
// ============================================================

const CV_W = 900, CV_H = 600;

// ── Geometría (coordenadas del lienzo) ──────────────────────
const MESA_Y  = 520;                  // borde superior de la mesa
const DIAL    = { x: 170, y: 300, r: 100 };
const EJE     = 452;                  // eje de la jeringa (y)
const X0      = 352;                  // raya del 0 de la jeringa
const LARGO   = 240;                  // px de la escala, de 0 a la capacidad
const GOMA_W  = 14;                   // ancho de la goma del émbolo
const VASTAGO = 250;                  // largo del vástago, de la goma al mango
const LLAVE   = { x: 290, y: EJE };
const RADIO_JERINGA = 20;

// ── Física ──────────────────────────────────────────────────
// Al mover el émbolo deprisa, el aire se calienta (al empujar) o se enfría (al tirar)
// y vuelve a la temperatura de la sala en unos segundos.
const CALENTAMIENTO = 0.09;           // fracción del calentamiento adiabático que se nota
const TAU_TERMICO   = 1.4;            // s
const TAU_AGUJA     = 0.12;           // s: la aguja tiene algo de inercia
const VELOCIDAD_TECLAS = 0.12;        // capacidades por segundo al mover con botones

const VOL_PREDICCION = 45;
const OBJETIVOS = [40, 35, 30, 25, 20, 50, 60];   // volúmenes de las medidas del nivel guiado

const PASOS = [
    'Poner el émbolo en 40 mL con la llave abierta',
    'Leer la presión del aire de la sala',
    'Cerrar la llave para encerrar el aire',
    'Empujar hasta 35, 30, 25 y 20 mL y leer',
    'Tirar hasta 50 y 60 mL y leer',
    'Calcular P · V en cada medida',
    'Mirar la gráfica P frente a 1/V',
    'Predecir una presión y comprobarla',
    'Explicarlo con partículas',
];
const N_PASOS = PASOS.length;

const INDICACIONES = [
    'Paso 1: con la llave abierta (palanca hacia arriba), tira del mango del émbolo hasta que el borde de la goma que toca el aire quede en 40 mL.',
    'Paso 2: lleva la lupa a la aguja, lee la presión del aire de la sala y apunta la medida 1: el volumen y la presión.',
    'Paso 3: cierra la llave (palanca hacia abajo) para encerrar el aire de la jeringa.',
    'Paso 4: empuja el émbolo despacio hasta {v} mL. Espera a que la aguja se pare y apunta el volumen y la presión.',
    'Paso 5: ahora tira del émbolo hasta {v} mL. Espera a que la aguja se pare y apunta el volumen y la presión.',
    'Paso 6: calcula P · V en cada medida y apúntalo, redondeado a unidades. La unidad es kPa·mL: lo importante es que el número se repita.',
    'Paso 7: mira la gráfica del panel y cambia a «P frente a 1/V». ¿Cómo quedan ahora los puntos?',
    'Paso 8: con tu valor de P · V, calcula qué presión marcará el manómetro con 45 mL y apúntala. Después lleva el émbolo a 45 mL y compruébalo.',
    'Paso 9: responde en el panel la pregunta de partículas.',
];

const PREGUNTA = [
    { txt: 'las partículas del aire se hacen más pequeñas.',
      exp: 'No. Las partículas no cambian de tamaño: lo que cambia es el espacio vacío que hay entre ellas.' },
    { txt: 'las partículas, al estar más juntas, se repelen y empujan.',
      exp: 'No. En un gas las partículas están muy separadas y casi no se notan unas a otras. La presión es el efecto de sus choques contra las paredes.' },
    { txt: 'hay las mismas partículas en menos espacio y chocan más veces contra las paredes.', ok: true,
      exp: '✓ Eso es. Hay las mismas partículas, a la misma temperatura, en menos espacio: cada trozo de pared recibe más choques por segundo. Con la mitad de volumen, el doble de choques y el doble de presión.' },
    { txt: 'las partículas se mueven más despacio porque tienen menos sitio.',
      exp: 'No. Lo deprisa que se mueven las partículas depende de la temperatura, y la temperatura no cambia. Por eso hay que esperar a que la aguja se pare.' },
];

// ── Estado ─────────────────────────────────────────────────
let nivel = 'guiada';          // 'guiada' | 'libre'
let montaje = MONTAJES[Math.floor(Math.random() * MONTAJES.length)];   // al azar, salvo ?montaje=N
let capJeringa = 60;
let tipoManometro = 'absoluto';

let V = 25;                    // mL: dónde está el borde de la goma que toca el aire
let vObjetivo = null;          // mL a los que va el émbolo cuando se mueve con botones o al encajar
let vAnterior = 25;
let aire = 0;                  // P·V del aire encerrado a la temperatura de la sala (kPa·mL)
let theta = 0;                 // K por encima de la temperatura de la sala
let pAguja = 0;                // lo que marca la aguja (kPa, en la escala del manómetro)
let llaveAbierta = true;
let llaveCerradaUnaVez = false;
let avisoSobrepaso = false;    // ya se ha explicado por qué se pasa la aguja

let lupaPos = { x: 0, y: 0 };
let arrastre = null;           // { que: 'embolo' | 'lupa', dx, dy }
let errorPendiente = null;     // { tipo, t }
let bloqueado = false;

let datos = {};                // valores del cuaderno (números): v1, p1, pv1, iv1…, atm, pred
let correctos = {};
let vistoInversa = false;
let prediccionComprobada = false;
let respuesta = null;
let terminado = false;
let pestanaInversa = false;

let mensaje = '';
let mensajeT = -1e9;
let mensajeTipo = '';
let ultimoPaso = 0;
const DURACION_AVISO = 6000;
let TH = {};
let encima = null;
let punteroTipo = 'mouse';
let pulso = null;
let escala = 1;
let tAnterior = 0;

// ============================================================
//  p5
// ============================================================
function setup() {
    const canvas = createCanvas(CV_W, CV_H);
    canvas.parent('canvas-container');
    canvas.elt.setAttribute('role', 'application');
    canvas.elt.setAttribute('tabindex', '0');
    canvas.elt.setAttribute('aria-label', i18n.t('Mesa de laboratorio con un manómetro, una llave de tres vías y una jeringa con aire, conectados por un tubo, y una lupa. Con el ratón o el dedo se arrastran el mango del émbolo y la lupa, y se pulsa la palanca de la llave. Con el teclado, las flechas mueven la lupa y las teclas Av Pág y Re Pág mueven el émbolo. Los mensajes de la simulación se leen en voz alta.'));
    setupPuntero(canvas.elt);
    fitCanvas();
    frameRate(60);
    textFont('monospace');

    leerParametros();
    rellenarMontajes();
    construirCuaderno();
    construirPregunta();
    setupControles();
    setupThemeSelector();
    setNivel(nivel);
    tAnterior = millis();
}

function draw() {
    updateTheme();
    const ahora = millis();
    const dt = Math.min(0.05, (ahora - tAnterior) / 1000);
    tAnterior = ahora;
    avanzarEmbolo(dt);
    avanzarAire(dt);
    vigilarLimites();
    if (nivel === 'guiada' && pasoActual() === 8 && correctos.pred && !prediccionComprobada && enVolumen(VOL_PREDICCION) && agujaQuieta()) {
        comprobarPrediccion();
    }
    if (errorPendiente && millis() > errorPendiente.t) {
        const tipo = errorPendiente.tipo;
        errorPendiente = null;
        mostrarError(tipo);
    }

    encima = objetoBajoPuntero();
    background(TH.fondo);
    dibujarEscena();
    dibujarResaltes();
    dibujarRotulos();
    dibujarLupa();
    actualizarCursor();
}

function dibujarEscena() {
    dibujarPared();
    dibujarBarometro();
    dibujarMesa();
    dibujarManometro();
    dibujarTubo();
    dibujarLlave();
    dibujarJeringa();
}

// ============================================================
//  Parámetros y montaje
// ============================================================
function leerParametros() {
    const q = new URLSearchParams(location.search);
    if (q.get('nivel') === 'libre') nivel = 'libre';
    const n = parseInt(q.get('montaje'), 10);
    const m = MONTAJES.find(x => x.n === n);
    if (m) montaje = m;
    if (q.get('jeringa') === '20') capJeringa = 20;
    if (q.get('manometro') === 'relativo') tipoManometro = 'relativo';
    document.getElementById('select-jeringa').value = String(capJeringa);
    document.getElementById('select-manometro').value = tipoManometro;
}

function jeringa() { return JERINGAS[capJeringa]; }
function manometro() { return MANOMETROS[tipoManometro]; }
function tSalaK() { return montaje.tSala + 273.15; }

function elegirMontaje(n) {
    montaje = MONTAJES.find(m => m.n === n) || montaje;
    document.getElementById('select-montaje').value = String(montaje.n);
    reiniciar();
}

function reiniciar() {
    ocultarError();
    const j = jeringa();
    V = nivel === 'guiada' ? 25 : (capJeringa === 60 ? 30 : 10);
    vAnterior = V;
    vObjetivo = null;
    aire = montaje.patm * V;
    theta = 0;
    llaveAbierta = true;
    llaveCerradaUnaVez = false;
    pAguja = lecturaManometro();
    arrastre = null;
    errorPendiente = null;
    datos = {};
    correctos = {};
    vistoInversa = false;
    prediccionComprobada = false;
    respuesta = null;
    terminado = false;
    pestanaInversa = false;
    mensaje = '';
    mensajeT = -1e9;
    ultimoPaso = 0;
    lupaPos = lupaReposo();
    limpiarCuaderno();
    actualizarInterfaz();
    dibujarGrafica();
    if (j.cap !== capJeringa) capJeringa = j.cap;
}

// ============================================================
//  Física del aire encerrado
// ============================================================
function presionReal() {
    return aire / V * (tSalaK() + theta) / tSalaK();
}

// Presión que tendría el aire ya a la temperatura de la sala
function presionEquilibrio() {
    return aire / V;
}

function lecturaManometro() {
    const p = presionReal();
    return manometro().absoluto ? p : p - montaje.patm;
}

function avanzarEmbolo(dt) {
    if (vObjetivo === null || arrastre) return;
    const paso = VELOCIDAD_TECLAS * capJeringa * dt;
    if (Math.abs(vObjetivo - V) <= paso) { V = vObjetivo; vObjetivo = null; actualizarInterfaz(); }
    else V += Math.sign(vObjetivo - V) * paso;
}

function avanzarAire(dt) {
    const dV = V - vAnterior;
    vAnterior = V;
    if (llaveAbierta) {
        // Con la llave abierta el aire entra y sale: la presión es la de la sala
        aire = montaje.patm * V;
        theta *= Math.exp(-dt / 0.3);
    } else if (dV !== 0) {
        theta += -CALENTAMIENTO * (tSalaK() + theta) * dV / V;
    }
    theta *= Math.exp(-dt / TAU_TERMICO);
    const objetivo = lecturaManometro();
    pAguja += (objetivo - pAguja) * Math.min(1, dt / TAU_AGUJA);

    if (!avisoSobrepaso && !llaveAbierta && Math.abs(presionReal() - presionEquilibrio()) > 2) {
        avisoSobrepaso = true;
        decir(i18n.t('⚠ La aguja se ha pasado unos {d} kPa: al mover el émbolo deprisa, el aire se calienta o se enfría un poco. Tarda unos 4 s en volver a la temperatura de la sala. Espera a que la aguja se pare antes de leer.', {
            d: i18n.num(Math.abs(presionReal() - presionEquilibrio()), 0),
        }), 'aviso');
    }
}

// La aguja está parada y el aire, a la temperatura de la sala
function agujaQuieta() {
    return Math.abs(presionReal() - presionEquilibrio()) < 0.25 && Math.abs(pAguja - lecturaManometro()) < 0.2
        && vObjetivo === null && !arrastre;
}

function enVolumen(v) {
    return Math.abs(V - v) < 0.01 && vObjetivo === null && !arrastre;
}

// Fuera de los límites del montaje: el tubo se suelta o el émbolo se sale
function vigilarLimites() {
    if (bloqueado || errorPendiente) return;
    const m = manometro();
    if (!llaveAbierta && lecturaManometro() > m.max + 0.5) {
        errorPendiente = { tipo: 'tubo', t: millis() + 250 };
        arrastre = null;
        vObjetivo = null;
    } else if (V > capJeringa + 1.5) {
        errorPendiente = { tipo: 'embolo', t: millis() + 150 };
        arrastre = null;
        vObjetivo = null;
    }
}

// ============================================================
//  Llave y émbolo
// ============================================================
function pulsarLlave() {
    if (bloqueado) return;
    if (nivel === 'guiada') {
        const paso = pasoActual();
        if (llaveAbierta && paso < 3) {
            decir(i18n.t('Todavía no cierres la llave: primero pon el émbolo en 40 mL y apunta la presión del aire de la sala.'));
            return;
        }
        if (llaveAbierta && !enVolumen(40)) {
            decir(i18n.t('Antes de cerrar la llave, vuelve a poner el émbolo en 40 mL, como en la medida 1.'));
            return;
        }
        if (!llaveAbierta) {
            const hayMedidas = OBJETIVOS.some((_, i) => i > 0 && correctos['p' + (i + 1)]);
            if (hayMedidas || !enVolumen(40)) {
                llaveAbierta = true;
                errorPendiente = { tipo: 'llave', t: millis() + 400 };
                actualizarInterfaz();
                return;
            }
        }
    }
    llaveAbierta = !llaveAbierta;
    if (!llaveAbierta) llaveCerradaUnaVez = true;
    decir(llaveAbierta
        ? i18n.t('Llave abierta: la jeringa y el manómetro comunican con el aire de la sala.')
        : i18n.t('Llave cerrada: el aire de la jeringa queda encerrado. Ahora siempre es el mismo aire.'));
    actualizarInterfaz();
}

function moverEmbolo(sentido) {
    if (bloqueado) return;
    const d = jeringa().div;
    const base = vObjetivo !== null ? vObjetivo : Math.round(V / d) * d;
    vObjetivo = constrain(base + sentido * d, d, capJeringa + 2);
}

// En el nivel guiado el émbolo encaja en cada división al soltarlo
function encajar() {
    if (nivel !== 'guiada') return;
    const d = jeringa().div;
    const v = constrain(Math.round(V / d) * d, d, capJeringa);
    if (Math.abs(v - V) > 1e-6) vObjetivo = v;
}

function xGoma(v = V) { return X0 + v * jeringa().pxMl; }
function xMango() { return xGoma() + GOMA_W + VASTAGO; }

// ============================================================
//  Errores que obligan a empezar de nuevo
// ============================================================
const ERRORES = {
    tubo: {
        titulo: 'Se ha soltado el tubo',
        texto: 'Has empujado el émbolo hasta que la presión ha pasado del límite del manómetro. El tubo se ha soltado de la jeringa y se ha escapado aire, así que ya no tienes la misma cantidad de gas y las medidas no valen. Vuelve a empezar y no empujes tanto: la aguja no debe pasar del final de la escala.',
    },
    embolo: {
        titulo: 'Se ha salido el émbolo',
        texto: 'Has tirado del émbolo más allá de la última raya y se ha salido de la jeringa. Ha entrado aire de la sala, así que ya no es el mismo aire y las medidas no valen. Vuelve a empezar y no pases de la última raya.',
    },
    llave: {
        titulo: 'Has abierto la llave',
        texto: 'Al abrir la llave, el aire de la jeringa se ha puesto en contacto con el de la sala: ha entrado o salido aire. Ya no tienes la misma cantidad de gas, así que las medidas anteriores no se pueden comparar con las nuevas. Vuelve a empezar y deja la llave cerrada durante todas las medidas.',
    },
};

const VINETAS = {
    tubo: '<svg viewBox="0 0 300 120" width="300" height="120"><line class="v-mesa" x1="10" y1="110" x2="290" y2="110"/><rect class="v-jeringa" x="120" y="58" width="130" height="26" rx="3"/><rect class="v-goma" x="140" y="59" width="9" height="24"/><path class="v-cian" d="M149 71H262M262 56V86"/><path class="v-tubo" d="M120 71H108"/><path class="v-tubo" d="M40 48Q70 40 82 62"/><path class="v-aire" d="M96 62l-10-8M98 72H84M96 82l-10 8"/><circle class="v-esfera" cx="40" cy="30" r="18"/><path class="v-aguja" d="M40 30 52 18"/></svg>',
    embolo: '<svg viewBox="0 0 300 120" width="300" height="120"><line class="v-mesa" x1="10" y1="110" x2="290" y2="110"/><rect class="v-jeringa" x="40" y="58" width="150" height="26" rx="3"/><path class="v-tubo" d="M40 71H22"/><rect class="v-goma" x="208" y="60" width="9" height="22" transform="rotate(12 212 71)"/><path class="v-cian" d="M217 73H284M284 58V88"/><path class="v-aire" d="M196 52l6-8M200 71h10M196 90l6 8"/></svg>',
    llave: '<svg viewBox="0 0 300 120" width="300" height="120"><line class="v-mesa" x1="10" y1="110" x2="290" y2="110"/><circle class="v-esfera" cx="50" cy="40" r="22"/><path class="v-aguja" d="M50 40 64 30"/><path class="v-tubo" d="M50 62V76H128M172 76H200"/><rect class="v-jeringa" x="128" y="66" width="44" height="20" rx="4"/><path class="v-tubo" d="M150 86V96"/><path class="v-cian" d="M150 66V40"/><rect class="v-jeringa" x="200" y="62" width="80" height="28" rx="3"/><rect class="v-goma" x="228" y="63" width="8" height="26"/><path class="v-aire" d="M140 100l-6 8M150 102v8M160 100l6 8"/></svg>',
};

function mostrarError(tipo) {
    const e = ERRORES[tipo];
    document.getElementById('error-vineta').innerHTML = VINETAS[tipo] || '';
    document.getElementById('error-titulo').textContent = i18n.t(e.titulo);
    document.getElementById('error-texto').textContent = i18n.t(e.texto);
    document.getElementById('error-lab').hidden = false;
    bloqueado = true;
    arrastre = null;
    document.querySelectorAll('.control-panel, .barra-lab, .botones-tactiles, #canvas-container').forEach(el => { el.inert = true; });
    document.getElementById('error-reiniciar').focus();
}

function ocultarError() {
    const caja = document.getElementById('error-lab');
    if (!caja || caja.hidden) return;
    caja.hidden = true;
    bloqueado = false;
    document.querySelectorAll('.control-panel, .barra-lab, .botones-tactiles, #canvas-container').forEach(el => { el.inert = false; });
}

// ============================================================
//  Escalas: lo que diría quien mira por la lupa
// ============================================================
function describirEscalas() {
    const m = manometro();
    const p = pAguja;
    const abajo = Math.floor((p - m.min) / m.div + 1e-6) * m.div + m.min;
    const resto = (p - abajo) / m.div;
    let tAguja;
    if (resto < 0.15) tAguja = i18n.t('La aguja está justo en la raya de {a} kPa.', { a: fmtKpa(abajo) });
    else if (resto > 0.85) tAguja = i18n.t('La aguja está justo en la raya de {a} kPa.', { a: fmtKpa(abajo + m.div) });
    else tAguja = i18n.t('La aguja está entre las rayas de {a} y {b} kPa.', { a: fmtKpa(abajo), b: fmtKpa(abajo + m.div) });
    if (!agujaQuieta()) tAguja += ' ' + i18n.t('Todavía se mueve.');

    const d = jeringa().div;
    const vAbajo = Math.floor(V / d + 1e-6) * d;
    const vResto = (V - vAbajo) / d;
    let tGoma;
    if (vResto < 0.15) tGoma = i18n.t('El borde de la goma que toca el aire está en la raya de {a} mL.', { a: i18n.num(vAbajo) });
    else if (vResto > 0.85) tGoma = i18n.t('El borde de la goma que toca el aire está en la raya de {a} mL.', { a: i18n.num(vAbajo + d) });
    else tGoma = i18n.t('El borde de la goma que toca el aire está entre las rayas de {a} y {b} mL.', { a: i18n.num(vAbajo), b: i18n.num(vAbajo + d) });
    decir(tAguja + ' ' + tGoma + ' ' + i18n.t('Cada raya del manómetro vale {m} kPa y cada raya de la jeringa, {j} mL.', { m: m.div, j: i18n.num(d) }));
}

function fmtKpa(x) {
    return x < 0 ? '−' + Math.abs(x) : String(x);
}

// ============================================================
//  Nivel guiado: pasos y cuaderno
// ============================================================
function filaHecha(i) { return correctos['v' + i] && correctos['p' + i]; }

function filaActual() {
    for (let i = 1; i <= OBJETIVOS.length; i++) if (!filaHecha(i)) return i;
    return 0;
}

function pasoActual() {
    if (!filaHecha(1)) return enVolumen(40) && llaveAbierta ? 2 : 1;
    if (llaveAbierta) return 3;
    if (![2, 3, 4, 5].every(filaHecha)) return 4;
    if (![6, 7].every(filaHecha)) return 5;
    if (!OBJETIVOS.every((_, i) => correctos['pv' + (i + 1)])) return 6;
    if (!vistoInversa) return 7;
    if (!(correctos.pred && prediccionComprobada)) return 8;
    if (!terminado) return 9;
    return 10;
}

function indicacionPaso(paso) {
    const fila = filaActual();
    return i18n.t(INDICACIONES[paso - 1], { v: fila ? OBJETIVOS[fila - 1] : '' });
}

function leerNumero(txt) {
    const s = String(txt).trim().replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace('−', '-');
    if (s === '' || !/^-?\d*\.?\d+$/.test(s)) return null;
    return parseFloat(s);
}

// Los miles con punto (3.784) o sin él (3784); los decimales, con coma
function leerNumeroCuaderno(txt) {
    const t = String(txt).trim();
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return leerNumero(t);
    return leerNumero(t.replace('.', ','));
}

function comprobarDato(id) {
    const inp = document.getElementById('dato-' + id);
    const x = leerNumeroCuaderno(inp.value);
    if (x === null) {
        if (inp.value.trim() !== '') avisoCuaderno(i18n.t('Escribe solo el número, sin la unidad.'), 'mal');
        return;
    }
    datos[id] = x;
    const tipo = id.replace(/\d+$/, '');
    const i = parseInt(id.replace(/^\D+/, ''), 10);
    const j = jeringa(), m = manometro();
    let ok = false, pista = '';

    // Cada medida se toma con el émbolo en su volumen y en orden
    if ((tipo === 'v' || tipo === 'p') && !filaHecha(i)) {
        const fila = filaActual();
        let aviso = '';
        if (i !== fila) aviso = i18n.t('Ve en orden: ahora toca la medida {f}.', { f: fila });
        else if (!enVolumen(OBJETIVOS[i - 1])) aviso = i18n.t('La medida {i} se toma con el émbolo en {v} mL. Llévalo ahí y espera a que la aguja se pare.', { i, v: OBJETIVOS[i - 1] });
        else if (i > 1 && llaveAbierta) aviso = i18n.t('Antes de medir, cierra la llave para encerrar el aire.');
        if (aviso) {
            correctos[id] = false;
            marcar(id, false);
            avisoCuaderno(aviso, 'mal');
            actualizarInterfaz();
            return;
        }
    }

    if (tipo === 'v') {
        ok = Math.abs(x - V) <= j.div / 2 + 0.02;
        if (!ok && Math.abs(x - (V + GOMA_W / j.pxMl)) <= 1) {
            pista = i18n.t('Has leído el borde de la goma que no toca el aire. El volumen del aire llega hasta el borde de la izquierda, el que está en contacto con él.');
        } else {
            pista = i18n.t('Revisa la lectura de la jeringa. Lleva la lupa al borde izquierdo de la goma y cuenta las rayas desde la raya con número.');
        }
    } else if (tipo === 'p') {
        if (!agujaQuieta()) {
            ok = false;
            pista = i18n.t('La aguja aún se mueve. Espera a que se pare antes de leer: el aire tiene que volver a la temperatura de la sala.');
        } else {
            const real = lecturaManometro();
            ok = Math.abs(x - real) <= m.div / 2 + 0.02;
            pista = Math.abs(x - real) <= 3 * m.div
                ? i18n.t('Casi. Cada raya del manómetro vale 2 kPa: cuenta las rayas desde el número más cercano.')
                : i18n.t('Revisa la lectura. Lleva la lupa a la punta de la aguja para ver bien las rayas.');
        }
    } else if (tipo === 'pv') {
        const esperado = datos['v' + i] * datos['p' + i];
        ok = Math.abs(x - esperado) <= Math.max(1, esperado * 0.01);
        pista = Math.abs(x - (datos['v' + i] + datos['p' + i])) < 1
            ? i18n.t('Has sumado. Hay que multiplicar: P · V.')
            : i18n.t('Revisa la multiplicación: P · V, con tu volumen y tu presión de esa medida.');
    } else if (tipo === 'iv') {
        const esperado = 1000 / datos['v' + i];
        ok = Math.abs(x - esperado) <= Math.max(0.05, esperado * 0.01);
        pista = Math.abs(x - 1 / datos['v' + i]) < 0.002
            ? i18n.t('Ese es 1/V en mL⁻¹. Aquí va en L⁻¹: como 1 L = 1000 mL, 1/V = 1000 / V.')
            : i18n.t('1/V en L⁻¹ es 1000 entre tu volumen en mL. Por ejemplo, con 40 mL: 1000 / 40 = 25.');
    } else if (id === 'atm') {
        const esperado = datos.p1 / 101.3;
        ok = Math.abs(x - esperado) <= 0.006;
        pista = i18n.t('Divide tu presión entre 101,3 kPa, que es 1 atm. Redondea a dos decimales.');
    } else if (id === 'pred') {
        const k = kAlumno();
        const esperado = k / VOL_PREDICCION;
        ok = Math.abs(x - esperado) <= esperado * 0.02;
        pista = Math.abs(x - k * VOL_PREDICCION) < 1 || Math.abs(x - VOL_PREDICCION / k) < 0.01
            ? i18n.t('Revisa la cuenta: si P · V = k, entonces P = k / V.')
            : i18n.t('Usa tu valor de P · V (unos {k} kPa·mL) y divide entre 45 mL.', { k: i18n.num(Math.round(k)) });
    }

    correctos[id] = ok;
    marcar(id, ok);
    if (ok) {
        let txt = i18n.t('Bien apuntado.');
        if (id === 'atm') txt = i18n.t('Bien: unas {a} atm. Es menos de 1 atm porque Madrid está a unos 650 m de altitud y encima hay menos aire.', { a: i18n.num(x, 2) });
        if (id === 'pred') txt = i18n.t('Predicción apuntada. Ahora lleva el émbolo a 45 mL, espera a que la aguja se pare y mira si marca lo que has predicho.');
        const siguiente = pasoActual();
        if (id !== 'atm' && id !== 'pred' && siguiente <= N_PASOS) txt += ' ' + indicacionPaso(siguiente);
        avisoCuaderno(txt, 'bien');
        if (tipo === 'pv' && OBJETIVOS.every((_, k) => correctos['pv' + (k + 1)])) resultadoLey();
    } else {
        avisoCuaderno(pista, 'mal');
    }
    actualizarInterfaz();
    dibujarGrafica();
}

function marcar(id, ok) {
    const marca = document.getElementById('marca-' + id);
    if (marca) {
        marca.textContent = ok ? '✓' : '✗';
        marca.className = 'marca ' + (ok ? 'bien' : 'mal');
    }
    const inp = document.getElementById('dato-' + id);
    inp.classList.toggle('bien', ok);
    inp.classList.toggle('mal', !ok);
}

function kAlumno() {
    const pvs = OBJETIVOS.map((_, i) => datos['pv' + (i + 1)]).filter(x => x > 0);
    return pvs.length ? pvs.reduce((a, b) => a + b, 0) / pvs.length : 0;
}

function resultadoLey() {
    const pvs = OBJETIVOS.map((_, i) => datos['pv' + (i + 1)]);
    const k = kAlumno();
    const cambio = (Math.max(...pvs) - Math.min(...pvs)) / k * 100;
    const res = document.getElementById('resultado-ley');
    res.hidden = false;
    if (cambio < 3.5) {
        res.className = 'resultado bien';
        res.textContent = i18n.t('✓ P · V vale unos {k} kPa·mL en todas las medidas: entre la mayor y la menor cambia solo un {c} %. A temperatura constante, P · V = constante: es la ley de Boyle-Mariotte. Esa diferencia pequeña sale de redondear al leer.', {
            k: Math.round(k).toLocaleString('es-ES'), c: i18n.num(cambio, 1),
        });
    } else {
        res.className = 'resultado mal';
        res.textContent = i18n.t('P · V cambia un {c} % entre la medida mayor y la menor. Busca la medida que más se aleja y repasa su lectura.', { c: i18n.num(cambio, 1) });
    }
}

function comprobarPrediccion() {
    prediccionComprobada = true;
    const res = document.getElementById('resultado-pred');
    res.hidden = false;
    res.className = 'resultado bien';
    res.textContent = i18n.t('✓ Con 45 mL la aguja marca lo que habías calculado, unos {p} kPa. Una ley sirve para eso: para predecir una medida antes de hacerla.', {
        p: i18n.num(datos.pred, 0),
    });
    avisoCuaderno(i18n.t('Predicción comprobada.'), 'bien');
    decir(i18n.t('Predicción comprobada. Último paso: la pregunta de partículas.'));
    actualizarInterfaz();
}

function elegirRespuesta(k) {
    if (nivel !== 'guiada' || pasoActual() !== 9) return;
    respuesta = k;
    const op = PREGUNTA[k];
    const res = document.getElementById('resultado-pregunta');
    res.hidden = false;
    res.className = 'resultado ' + (op.ok ? 'bien' : 'mal');
    res.textContent = i18n.t(op.exp);
    if (op.ok) {
        terminado = true;
        decir(i18n.t('Práctica terminada. Puedes repetirla con otro montaje: tendrá otra presión atmosférica y otro valor de P · V, pero también será constante.'));
    }
    actualizarInterfaz();
}

function avisoCuaderno(txt, tipo) {
    const el = document.getElementById('aviso-cuaderno');
    el.textContent = txt;
    el.className = 'aviso-cuaderno' + (tipo ? ' ' + tipo : '');
}

// ── Cuaderno: siete medidas con V, P, P·V y 1/V ──
function construirCuaderno() {
    const t = document.getElementById('tabla-medidas');
    const cab = [
        ['N.º', ''],
        ['<i>V</i> (mL)', ''],
        ['<i>P</i> (kPa)', ''],
        ['<i>P</i> · <i>V</i>', '(kPa·mL)'],
        ['1/<i>V</i>', '(L⁻¹) opcional'],
    ];
    cab.forEach(([a, b]) => {
        const s = document.createElement('span');
        s.className = 'th';
        s.setAttribute('role', 'columnheader');
        s.innerHTML = a + (b ? `<span class="opcional">${i18n.t(b)}</span>` : '');
        t.appendChild(s);
    });
    OBJETIVOS.forEach((v, k) => {
        const i = k + 1;
        const n = document.createElement('span');
        n.className = 'n';
        n.id = 'fila-' + i;
        n.textContent = String(i);
        t.appendChild(n);
        ['v', 'p', 'pv', 'iv'].forEach(tipo => {
            const inp = document.createElement('input');
            inp.className = 'dato';
            inp.id = 'dato-' + tipo + i;
            inp.type = 'text';
            inp.inputMode = 'decimal';
            inp.autocomplete = 'off';
            const nombre = { v: 'Volumen', p: 'Presión', pv: 'P por V', iv: 'Uno entre V' }[tipo];
            inp.setAttribute('aria-label', i18n.t('{q} de la medida {i}', { q: i18n.t(nombre), i }));
            t.appendChild(inp);
        });
        const obj = document.createElement('span');
        obj.className = 'objetivo';
        obj.id = 'objetivo-' + i;
        obj.textContent = i18n.t('Medida {i}: con el émbolo en {v} mL', { i, v });
        obj.hidden = true;
        t.appendChild(obj);
    });
    document.querySelectorAll('.dato').forEach(inp => {
        const id = inp.id.replace('dato-', '');
        inp.addEventListener('change', () => comprobarDato(id));
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); comprobarDato(id); } });
    });
}

function limpiarCuaderno() {
    document.querySelectorAll('.dato').forEach(inp => {
        inp.value = '';
        inp.classList.remove('bien', 'mal');
    });
    document.querySelectorAll('.marca').forEach(m => { m.textContent = ''; m.className = 'marca'; });
    ['resultado-ley', 'resultado-pred', 'resultado-pregunta'].forEach(id => { document.getElementById(id).hidden = true; });
    avisoCuaderno(i18n.t('Escribe lo que leas en los instrumentos y pulsa Intro.'));
    document.querySelectorAll('.opcion').forEach(b => b.classList.remove('elegida', 'acierto'));
}

function construirPregunta() {
    const c = document.getElementById('pregunta');
    PREGUNTA.forEach((op, k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'opcion';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', 'false');
        b.textContent = i18n.t(op.txt);
        b.addEventListener('click', () => elegirRespuesta(k));
        c.appendChild(b);
    });
}

// ── Gráfica del panel ──
function dibujarGrafica() {
    const svg = document.getElementById('grafica');
    if (!svg) return;
    const inv = pestanaInversa;
    const X0g = 40, Y0g = 176, W = 266, H = 160;
    const xmax = inv ? 60 : 70, ymax = 200;
    const sx = x => X0g + x / xmax * W, sy = y => Y0g - y / ymax * H;
    let s = '';
    for (let y = 0; y <= ymax; y += 50) {
        s += `<line class="g-rejilla" x1="${X0g}" x2="${X0g + W}" y1="${sy(y)}" y2="${sy(y)}"/>`;
        s += `<text class="g-texto" x="${X0g - 6}" y="${sy(y) + 3}" text-anchor="end">${y}</text>`;
    }
    for (let x = 0; x <= xmax; x += inv ? 10 : 10) {
        s += `<text class="g-texto" x="${sx(x)}" y="${Y0g + 13}" text-anchor="middle">${x}</text>`;
    }
    s += `<line class="g-eje" x1="${X0g}" y1="${Y0g}" x2="${X0g + W}" y2="${Y0g}"/><line class="g-eje" x1="${X0g}" y1="${Y0g}" x2="${X0g}" y2="${Y0g - H}"/>`;
    s += `<text class="g-titulo" x="${X0g + W}" y="${Y0g + 28}" text-anchor="end">${inv ? i18n.t('1/V (L⁻¹)') : i18n.t('V (mL)')}</text>`;
    s += `<text class="g-titulo" x="${X0g - 32}" y="${Y0g - H - 8}">${i18n.t('P (kPa)')}</text>`;

    const pts = OBJETIVOS.map((_, k) => k + 1).filter(filaHecha).map(i => [datos['v' + i], datos['p' + i]]);
    if (pasoActual() > 6) {
        const k = kAlumno();
        let d = '';
        if (inv) d = `M${sx(0)},${sy(0)} L${sx(xmax)},${sy(Math.min(ymax * 1.2, k * xmax / 1000))}`;
        else for (let v = k / ymax; v <= xmax; v += 0.5) d += (d ? 'L' : 'M') + sx(v).toFixed(1) + ',' + sy(k / v).toFixed(1);
        s += `<path class="g-ley" d="${d}"/>`;
    }
    pts.forEach(([v, p]) => {
        s += `<circle class="g-punto" cx="${sx(inv ? 1000 / v : v).toFixed(1)}" cy="${sy(p).toFixed(1)}" r="3.6"/>`;
    });
    if (!pts.length) s += `<text class="g-vacia" x="${X0g + W / 2}" y="${Y0g - H / 2}" text-anchor="middle">${i18n.t('Aquí aparecerán tus medidas.')}</text>`;
    svg.innerHTML = s;
    svg.setAttribute('aria-label', inv
        ? i18n.t('Gráfica de la presión frente a 1/V con {n} puntos.', { n: pts.length })
        : i18n.t('Gráfica de la presión frente al volumen con {n} puntos.', { n: pts.length }));
}

function cambiarPestana(inv) {
    pestanaInversa = inv;
    document.getElementById('graf-pv').classList.toggle('activa', !inv);
    document.getElementById('graf-inv').classList.toggle('activa', inv);
    document.getElementById('graf-pv').setAttribute('aria-selected', String(!inv));
    document.getElementById('graf-inv').setAttribute('aria-selected', String(inv));
    if (inv && nivel === 'guiada' && pasoActual() === 7) {
        vistoInversa = true;
        avisoCuaderno(i18n.t('Con 1/V los puntos quedan en una recta que pasa por el origen: P es proporcional a 1/V. Si el volumen se reduce a la mitad, la presión se duplica.'), 'bien');
    }
    dibujarGrafica();
    actualizarInterfaz();
}

// ============================================================
//  Interfaz
// ============================================================
function setNivel(n) {
    nivel = n;
    document.body.classList.remove('nivel-guiada', 'nivel-libre');
    document.body.classList.add('nivel-' + n);
    ['guiada', 'libre'].forEach(m => {
        const b = document.getElementById('nivel-' + m);
        b.classList.toggle('active', m === n);
        b.setAttribute('aria-selected', String(m === n));
    });
    if (n === 'guiada') {
        capJeringa = 60;
        tipoManometro = 'absoluto';
        document.getElementById('select-jeringa').value = '60';
        document.getElementById('select-manometro').value = 'absoluto';
    }
    elegirMontaje(montaje.n);
    fitCanvas();
}

function actualizarInterfaz() {
    const guiada = nivel === 'guiada';
    const paso = pasoActual();
    const fila = filaActual();

    const txtLlave = llaveAbierta ? i18n.t('Cerrar la llave') : i18n.t('Abrir la llave');
    document.getElementById('btn-llave').textContent = txtLlave;
    document.getElementById('tactil-llave').textContent = llaveAbierta ? i18n.t('Llave: cerrar') : i18n.t('Llave: abrir');

    // Pasos
    const lista = document.getElementById('lista-pasos');
    lista.innerHTML = '';
    PASOS.forEach((txt, i) => {
        const li = document.createElement('li');
        const n = i + 1;
        const estado = n < paso ? 'hecho' : n === paso ? 'ahora' : '';
        li.className = estado;
        if (estado === 'ahora') li.setAttribute('aria-current', 'step');
        const num = document.createElement('span');
        num.className = 'num';
        num.setAttribute('aria-hidden', 'true');
        num.textContent = estado === 'hecho' ? '✓' : String(n);
        li.appendChild(num);
        li.appendChild(document.createTextNode(i18n.t(txt) + (estado === 'hecho' ? ' ' : '')));
        if (estado === 'hecho') {
            const sr = document.createElement('span');
            sr.className = 'sr-only';
            sr.textContent = i18n.t('(hecho)');
            li.appendChild(sr);
        }
        lista.appendChild(li);
    });

    // Cuaderno: la medida que toca se escribe con el émbolo en su volumen
    OBJETIVOS.forEach((v, k) => {
        const i = k + 1;
        const actual = i === fila && (i === 1 ? paso === 2 : (i <= 5 ? paso === 4 : paso === 5));
        const enSitio = enVolumen(v);
        ['v', 'p'].forEach(t => {
            const inp = document.getElementById('dato-' + t + i);
            inp.disabled = !(actual && enSitio && !correctos[t + i]);
        });
        document.getElementById('dato-pv' + i).disabled = !(filaHecha(i) && paso >= 6 && !correctos['pv' + i]);
        document.getElementById('dato-iv' + i).disabled = !(filaHecha(i) && paso >= 6 && !correctos['iv' + i]);
        document.getElementById('fila-' + i).classList.toggle('ahora', actual);
        document.getElementById('objetivo-' + i).hidden = !(actual && !enSitio);
    });
    document.getElementById('dato-atm').disabled = !(filaHecha(1) && !correctos.atm);
    document.getElementById('dato-pred').disabled = !(paso === 8 && !correctos.pred);

    document.querySelectorAll('.opcion').forEach((b, k) => {
        b.disabled = !(guiada && paso === 9);
        const sel = k === respuesta;
        b.setAttribute('aria-checked', String(sel));
        b.classList.toggle('elegida', sel);
        b.classList.toggle('acierto', sel && PREGUNTA[k].ok);
    });

    if (guiada && paso !== ultimoPaso) {
        ultimoPaso = paso;
        pulso = OBJETO_PASO[paso] ? { obj: OBJETO_PASO[paso], t: millis() } : null;
        if (paso <= N_PASOS) anunciar(indicacionPaso(paso));
    }
}

function indicacion() {
    if (nivel === 'libre') return i18n.t('Sigue tu guión. Apunta en el papel todo lo que midas.');
    const paso = pasoActual();
    return paso <= N_PASOS ? indicacionPaso(paso) : i18n.t('Práctica terminada. Elige otro montaje para repetirla.');
}

function decir(txt, tipo) {
    mensaje = txt;
    mensajeTipo = tipo || '';
    mensajeT = millis();
    anunciar(txt);
}

function anunciar(txt) {
    const el = document.getElementById('anuncio');
    el.textContent = el.textContent === txt ? txt + ' ' : txt;
}

function rellenarMontajes() {
    const sel = document.getElementById('select-montaje');
    MONTAJES.forEach(m => {
        const o = document.createElement('option');
        o.value = String(m.n);
        o.textContent = i18n.t('Montaje {n}', { n: m.n });
        sel.appendChild(o);
    });
}

function setupControles() {
    document.getElementById('nivel-guiada').addEventListener('click', () => setNivel('guiada'));
    document.getElementById('nivel-libre').addEventListener('click', () => setNivel('libre'));
    document.getElementById('select-montaje').addEventListener('change', e => elegirMontaje(parseInt(e.target.value, 10)));
    document.getElementById('btn-azar').addEventListener('click', () => {
        let n;
        do { n = 1 + Math.floor(Math.random() * MONTAJES.length); } while (n === montaje.n);
        elegirMontaje(n);
    });
    document.getElementById('select-jeringa').addEventListener('change', e => { capJeringa = parseInt(e.target.value, 10); reiniciar(); });
    document.getElementById('select-manometro').addEventListener('change', e => { tipoManometro = e.target.value; reiniciar(); });

    document.getElementById('btn-llave').addEventListener('click', pulsarLlave);
    document.getElementById('tactil-llave').addEventListener('click', pulsarLlave);
    document.getElementById('btn-empujar').addEventListener('click', () => moverEmbolo(-1));
    document.getElementById('btn-tirar').addEventListener('click', () => moverEmbolo(1));
    document.getElementById('tactil-empujar').addEventListener('click', () => moverEmbolo(-1));
    document.getElementById('tactil-tirar').addEventListener('click', () => moverEmbolo(1));
    document.getElementById('btn-lupa-manometro').addEventListener('click', () => {
        llevarLupaAguja();
        decir(i18n.t('La lupa está sobre la punta de la aguja. Muévela con las flechas si quieres ver otra parte de la escala.'));
        document.querySelector('#canvas-container canvas').focus();
    });
    document.getElementById('btn-lupa-jeringa').addEventListener('click', () => {
        llevarLupaGoma();
        decir(i18n.t('La lupa está sobre el borde de la goma que toca el aire.'));
        document.querySelector('#canvas-container canvas').focus();
    });
    document.getElementById('btn-describir').addEventListener('click', describirEscalas);
    document.getElementById('btn-reiniciar').addEventListener('click', reiniciar);
    document.getElementById('graf-pv').addEventListener('click', () => cambiarPestana(false));
    document.getElementById('graf-inv').addEventListener('click', () => cambiarPestana(true));

    document.getElementById('error-lab').addEventListener('keydown', e => {
        if (e.key === 'Tab') { e.preventDefault(); document.getElementById('error-reiniciar').focus(); }
    });
    document.getElementById('error-reiniciar').addEventListener('click', () => {
        reiniciar();
        document.querySelector('#canvas-container canvas').focus();
    });
}

// ============================================================
//  Dibujo
// ============================================================
// Vista frontal pura y una sola luz, arriba a la izquierda.
// El cian marca lo que se puede coger o pulsar.

function dibujarPared() {
    const ctx = drawingContext;
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, 0, MESA_Y);
    g.addColorStop(0, TH.pared1);
    g.addColorStop(1, TH.pared2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CV_W, MESA_Y);
    if (TH.luzPared) {
        const r = ctx.createRadialGradient(300, 120, 20, 300, 120, 560);
        r.addColorStop(0, TH.luzPared);
        r.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = r;
        ctx.fillRect(0, 0, CV_W, MESA_Y);
    }
    ctx.restore();
}

function dibujarMesa() {
    noStroke();
    fill(TH.encimeraCanto);
    rect(0, MESA_Y, CV_W, 3);
    fill(TH.encimeraFrente);
    rect(0, MESA_Y + 3, CV_W, 15);
    fill(TH.mesa);
    rect(0, MESA_Y + 18, CV_W, CV_H - MESA_Y - 18);
    fill(TH.sombraCanto);
    rect(0, MESA_Y + 18, CV_W, 3);
}

function sombraContacto(x, ancho, y = MESA_Y) {
    if (TH.contraste) return;
    noStroke();
    fill(TH.sombra);
    ellipse(x, y + 1, ancho, 7);
    ellipse(x, y + 1, ancho * 0.7, 4);
}

function conAlfa(c, a) {
    const k = color(c);
    k.setAlpha(a);
    return k;
}

// Rótulo bajo un instrumento: nombre y, debajo, el dato técnico más pequeño
function rotulo(lineas, x, nombres = 1) {
    noStroke();
    textAlign(CENTER, TOP);
    const t1 = tamTexto(13), t2 = tamTexto(11);
    let y = MESA_Y + 26;
    if (escala < 0.62) lineas = lineas.slice(0, nombres);
    lineas.forEach((l, i) => {
        const esNombre = i < nombres;
        const t = esNombre ? t1 : t2;
        textSize(t);
        fill(esNombre ? TH.texto : TH.textoTenue);
        const medio = textWidth(l) / 2 + 6;
        text(l, constrain(x, medio, CV_W - medio), y);
        y += t * 1.25;
    });
}

function anguloDial(p) {
    const m = manometro();
    return radians(-225 + (constrain(p, m.min - 2, m.max + 4) - m.min) / (m.max - m.min) * 270);
}

// Manómetro de aguja (Bourdon): esfera blanca, aro metálico y soporte hasta la mesa
function dibujarManometro() {
    const { x, y, r } = DIAL;
    const m = manometro();
    // Soporte
    sombraContacto(x, 90);
    noStroke();
    fill(TH.pies);
    rect(x - 34, MESA_Y - 10, 68, 10, 2);
    fill(TH.soporte);
    rect(x - 6, y + r + 22, 12, MESA_Y - 10 - (y + r + 22));
    // Racor bajo la esfera
    fill(TH.metal);
    stroke(TH.metalBorde);
    strokeWeight(1);
    rect(x - 10, y + r + 6, 20, 18, 2);
    // Caja y aro
    stroke(TH.metalBorde);
    strokeWeight(2);
    fill(TH.metal);
    circle(x, y, 2 * r + 22);
    if (!TH.contraste) {
        noFill();
        stroke(TH.metalLuz);
        strokeWeight(2);
        arc(x, y, 2 * r + 16, 2 * r + 16, PI * 1.05, PI * 1.5);
    }
    stroke(TH.esferaBorde);
    strokeWeight(1);
    fill(TH.esfera);
    circle(x, y, 2 * r);
    // Franja roja al final de la escala
    noFill();
    stroke(TH.franja);
    strokeWeight(4);
    arc(x, y, 2 * r - 6, 2 * r - 6, anguloDial(m.max - 10), anguloDial(m.max));
    // Rayas
    for (let p = m.min; p <= m.max + 1e-6; p += m.div) {
        const a = anguloDial(p);
        const k = Math.round(p - m.min);
        const largo = k % m.numeros === 0 ? 13 : k % 10 === 0 ? 9 : 5;
        stroke(TH.tinta);
        strokeWeight(k % m.numeros === 0 ? 1.8 : 0.9);
        line(x + Math.cos(a) * (r - 4), y + Math.sin(a) * (r - 4), x + Math.cos(a) * (r - 4 - largo), y + Math.sin(a) * (r - 4 - largo));
        if (k % m.numeros === 0) {
            noStroke();
            fill(TH.tinta);
            textSize(11);
            textStyle(BOLD);
            textAlign(CENTER, CENTER);
            text(fmtKpa(Math.round(p)), x + Math.cos(a) * (r - 30), y + Math.sin(a) * (r - 30));
            textStyle(NORMAL);
        }
    }
    noStroke();
    fill(TH.tinta);
    textSize(12);
    textStyle(BOLD);
    textAlign(CENTER, CENTER);
    text('kPa', x, y + 34);
    textStyle(NORMAL);
    fill(TH.tintaTenue);
    textSize(8);
    text(m.absoluto ? i18n.t('ABSOLUTA') : i18n.t('RELATIVA'), x, y + 48);
    // Aguja con contrapeso
    const a = anguloDial(pAguja);
    stroke(TH.aguja);
    strokeWeight(2.4);
    strokeCap(ROUND);
    line(x - Math.cos(a) * 16, y - Math.sin(a) * 16, x + Math.cos(a) * (r - 10), y + Math.sin(a) * (r - 10));
    strokeCap(SQUARE);
    noStroke();
    fill(TH.eje);
    circle(x, y, 14);
    // Reflejo del cristal
    if (!TH.contraste) {
        noFill();
        stroke(255, 255, 255, 60);
        strokeWeight(3);
        arc(x, y, 2 * r - 26, 2 * r - 26, PI * 1.12, PI * 1.38);
    }
}

// Tubo del manómetro a la llave, y de la llave a la punta de la jeringa
function dibujarTubo() {
    const { x, y, r } = DIAL;
    noFill();
    stroke(TH.tuboBorde);
    strokeWeight(9);
    bezier(x + 10, y + r + 15, x + 40, y + r + 15, x + 38, EJE, x + 70, EJE);
    line(x + 70, EJE, LLAVE.x - 22, EJE);
    line(LLAVE.x + 24, EJE, X0 - 22, EJE);
    stroke(TH.tubo);
    strokeWeight(6);
    bezier(x + 10, y + r + 15, x + 40, y + r + 15, x + 38, EJE, x + 70, EJE);
    line(x + 70, EJE, LLAVE.x - 22, EJE);
    line(LLAVE.x + 24, EJE, X0 - 22, EJE);
}

// Llave de tres vías: la palanca apunta a la salida que cierra
function dibujarLlave() {
    const { x, y } = LLAVE;
    stroke(TH.metalBorde);
    strokeWeight(1);
    fill(TH.llave);
    rect(x - 24, y - 9, 48, 18, 4);
    rect(x - 5, y + 9, 10, 16);              // salida al aire de la sala
    fill(TH.metal);
    circle(x, y, 18);
    noStroke();
    fill(TH.acento);
    if (llaveAbierta) rect(x - 6, y - 46, 12, 38, 3);
    else rect(x - 6, y + 8, 12, 38, 3);
    if (!TH.contraste) {
        fill(255, 255, 255, 90);
        if (llaveAbierta) rect(x - 3, y - 43, 2, 32, 1);
        else rect(x - 3, y + 11, 2, 32, 1);
    }
    rotulo([i18n.t('llave'), llaveAbierta ? i18n.t('abierta') : i18n.t('cerrada')], x);
}

function dibujarJeringa() {
    const j = jeringa();
    const fin = X0 + LARGO;
    const xg = xGoma();
    const xm = xMango();
    // Soportes
    [X0 + 48, X0 + 208].forEach(sx => {
        sombraContacto(sx, 40);
        noStroke();
        fill(TH.pies);
        quad(sx - 16, MESA_Y, sx - 8, EJE + RADIO_JERINGA + 2, sx + 8, EJE + RADIO_JERINGA + 2, sx + 16, MESA_Y);
        fill(TH.soporte);
        rect(sx - 14, EJE + RADIO_JERINGA - 2, 28, 7, 2);
    });
    // Vástago y mango (cian = se coge)
    noStroke();
    fill(TH.vastago);
    stroke(TH.metalBorde);
    strokeWeight(1);
    rect(xg + GOMA_W, EJE - 5, VASTAGO, 10);
    noStroke();
    fill(TH.acento);
    rect(xm, EJE - 30, 10, 60, 3);
    if (!TH.contraste) {
        fill(255, 255, 255, 110);
        rect(xm + 2, EJE - 26, 2, 52, 1);
    }
    // Aire dentro (un velo apenas visible) y cilindro
    fill(TH.aireDentro);
    rect(X0 - 6, EJE - RADIO_JERINGA + 1, xg - X0 + 6, 2 * RADIO_JERINGA - 2);
    stroke(TH.vidrio);
    strokeWeight(2);
    fill(TH.vidrioFondo);
    rect(X0 - 6, EJE - RADIO_JERINGA - 1, fin - X0 + 18, 2 * RADIO_JERINGA + 2, 3);
    // Goma del émbolo: el borde izquierdo es el que toca el aire
    noStroke();
    fill(TH.goma);
    rect(xg, EJE - RADIO_JERINGA, GOMA_W, 2 * RADIO_JERINGA);
    fill(TH.gomaRaya);
    rect(xg + 4, EJE - RADIO_JERINGA, 2, 2 * RADIO_JERINGA);
    rect(xg + 9, EJE - RADIO_JERINGA, 2, 2 * RADIO_JERINGA);
    // El borde que toca el aire, marcado para leerlo bien
    stroke(TH.raya);
    strokeWeight(1.5);
    line(xg, EJE - RADIO_JERINGA + 1, xg, EJE + RADIO_JERINGA - 1);
    noStroke();
    // Aletas del final del cilindro
    fill(TH.vidrio);
    rect(fin + 12, EJE - 36, 8, 72, 2);
    // Cono de la punta
    stroke(TH.vidrio);
    strokeWeight(2);
    fill(TH.vidrioFondo);
    beginShape();
    vertex(X0 - 6, EJE - 8);
    vertex(X0 - 22, EJE - 4);
    vertex(X0 - 22, EJE + 4);
    vertex(X0 - 6, EJE + 8);
    endShape();
    // Escala
    const nDiv = Math.round(j.cap / j.div);
    for (let k = 0; k <= nDiv; k++) {
        const v = k * j.div;
        const x = X0 + v * j.pxMl;
        const conNumero = Math.abs(v / j.numeros - Math.round(v / j.numeros)) < 1e-6;
        const media = !conNumero && Math.abs(v / (j.numeros / 2) - Math.round(v / (j.numeros / 2))) < 1e-6;
        const l = conNumero ? 12 : media ? 8 : 5;
        stroke(TH.raya);
        strokeWeight(conNumero || media ? 1.3 : 0.8);
        line(x, EJE - RADIO_JERINGA - 1, x, EJE - RADIO_JERINGA - 1 + l);
        if (conNumero) {
            noStroke();
            fill(TH.texto);
            textSize(10);
            textAlign(CENTER, BOTTOM);
            text(i18n.num(v), x, EJE - RADIO_JERINGA - 5);
        }
    }
    noStroke();
    fill(TH.textoTenue);
    textSize(9);
    textAlign(LEFT, BOTTOM);
    text('mL', fin + 4, EJE - RADIO_JERINGA - 18);
    // Brillo del vidrio
    if (!TH.contraste) {
        fill(TH.brillo);
        rect(X0, EJE + RADIO_JERINGA - 7, fin - X0, 2.5, 1);
    }
    rotulo([i18n.t('jeringa de {c} mL', { c: j.cap }), i18n.t('división de {d} mL', { d: i18n.num(j.div) })], X0 + LARGO / 2);
    const m = manometro();
    rotulo([i18n.t('manómetro'), m.absoluto ? i18n.t('0–200 kPa · división 2 kPa') : i18n.t('relativo · división 2 kPa')], DIAL.x);
}

// Barómetro digital de pared: solo con el manómetro relativo
function dibujarBarometro() {
    if (manometro().absoluto) return;
    const x = 690, y = 120, w = 150, h = 62;
    stroke(TH.metalBorde);
    strokeWeight(1.5);
    fill(TH.metal);
    rect(x, y, w, h, 6);
    noStroke();
    fill(TH.pantalla);
    rect(x + 10, y + 8, w - 20, 32, 3);
    fill(TH.pantallaTexto);
    textSize(20);
    textStyle(BOLD);
    textAlign(RIGHT, CENTER);
    text(String(Math.round(montaje.patm * 10)), x + w - 46, y + 25);
    textStyle(NORMAL);
    textSize(11);
    textAlign(LEFT, CENTER);
    text('hPa', x + w - 42, y + 27);
    fill(TH.tinta);
    textSize(9);
    textAlign(CENTER, CENTER);
    text(i18n.t('BARÓMETRO'), x + w / 2, y + 51);
}

// ── Lupa ──
function aumentoLupa() { return 3; }
function radioLupa() { return escala < 0.62 ? 104 : 82; }
function lupaReposo() { return escala < 0.62 ? { x: 770, y: 262 } : { x: 770, y: 300 }; }

function dibujarLupa() {
    const { x, y } = lupaPos;
    const r = radioLupa();
    const cogida = arrastre && arrastre.que === 'lupa';
    strokeCap(ROUND);
    stroke(TH.aro);
    strokeWeight(8);
    line(x + r * 0.7, y + r * 0.7, x + r * 0.88, y + r * 0.88);
    stroke(TH.empunadura);
    strokeWeight(13);
    line(x + r * 0.9, y + r * 0.9, x + r * 1.27, y + r * 1.27);
    if (!TH.contraste) {
        stroke(TH.empunaduraLuz);
        strokeWeight(2.5);
        line(x + r * 0.93 + 2.6, y + r * 0.93 - 2.6, x + r * 1.22 + 2.6, y + r * 1.22 - 2.6);
    }
    strokeCap(SQUARE);

    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.arc(x, y, r, 0, TWO_PI);
    drawingContext.clip();
    noStroke();
    fill(TH.fondo);
    rect(x - r, y - r, 2 * r, 2 * r);
    push();
    translate(x, y);
    scale(aumentoLupa());
    translate(-x, -y);
    dibujarEscena();
    pop();
    if (!TH.contraste) {
        noFill();
        stroke(255, 255, 255, 70);
        strokeWeight(3.5);
        arc(x, y, r * 1.62, r * 1.62, PI * 1.2, PI * 1.42);
        strokeWeight(1.5);
        arc(x, y, r * 1.45, r * 1.45, PI * 1.25, PI * 1.36);
    }
    drawingContext.restore();

    noFill();
    if (!TH.contraste) {
        stroke(TH.aroSombra);
        strokeWeight(6.5);
        circle(x, y, 2 * r);
    }
    stroke(TH.aro);
    strokeWeight(4.5);
    circle(x, y, 2 * r);
    if (!TH.contraste) {
        stroke(TH.aroLuz);
        strokeWeight(1.6);
        arc(x, y, 2 * r, 2 * r, PI * 1.03, PI * 1.47);
    }
    const a = Math.max(cogida || encima === 'lupa' ? 230 : 0, 255 * intensidadPulso('lupa'));
    if (a > 0) {
        stroke(conAlfa(TH.acento, a));
        strokeWeight(2);
        circle(x, y, 2 * r + 9);
    }
}

function llevarLupaAguja() {
    const a = anguloDial(pAguja);
    lupaPos = { x: DIAL.x + Math.cos(a) * (DIAL.r - 14), y: DIAL.y + Math.sin(a) * (DIAL.r - 14) };
}

function llevarLupaGoma() {
    lupaPos = { x: xGoma(), y: EJE - RADIO_JERINGA - 4 };
}

// ── Resaltes en cian ──
const OBJETO_PASO = [null, 'embolo', 'lupa', 'llave', 'embolo', 'embolo', null, null, 'embolo', null];
const MOVIMIENTO_REDUCIDO = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function intensidadPulso(obj) {
    if (!pulso || pulso.obj !== obj || MOVIMIENTO_REDUCIDO) return 0;
    const t = millis() - pulso.t;
    return t < 1200 ? Math.sin(PI * (t % 600) / 600) : 0;
}

function objetoBajoPuntero() {
    if (punteroTipo !== 'mouse' || arrastre || bloqueado) return null;
    if (mouseX < 0 || mouseY < 0 || mouseX > CV_W || mouseY > CV_H) return null;
    const q = { x: mouseX, y: mouseY };
    if (sobreLupa(q)) return 'lupa';
    if (sobreMango(q)) return 'embolo';
    if (sobreLlave(q)) return 'llave';
    return null;
}

function dibujarResaltes() {
    const a = obj => Math.max(encima === obj || (arrastre && arrastre.que === obj) ? 220 : 0, 255 * intensidadPulso(obj));
    noFill();
    strokeWeight(2);
    if (a('embolo') > 0) {
        stroke(conAlfa(TH.acento, a('embolo')));
        rect(xMango() - 7, EJE - 37, 24, 74, 7);
    }
    if (a('llave') > 0) {
        stroke(conAlfa(TH.acento, a('llave')));
        rect(LLAVE.x - 14, llaveAbierta ? EJE - 52 : EJE - 14, 28, 66, 7);
    }
}

// ── Textos del lienzo: tarjeta de indicación y pastilla del montaje ──
function envolver(txt, ancho) {
    const lineas = [];
    let l = '';
    txt.split(' ').forEach(p => {
        const prueba = l ? l + ' ' + p : p;
        if (l && textWidth(prueba) > ancho) { lineas.push(l); l = p; } else l = prueba;
    });
    if (l) lineas.push(l);
    return lineas;
}

function espaciado(px) {
    try { drawingContext.letterSpacing = px + 'px'; } catch (e) { /* sin letterSpacing */ }
}

function dibujarRotulos() {
    const movil = escala < 0.62;
    const m = 12;
    const duracion = mensajeTipo === 'aviso' ? DURACION_AVISO * 2 : DURACION_AVISO;
    const hayMensaje = millis() - mensajeT < duracion && !arrastre;
    const esAviso = hayMensaje && mensajeTipo === 'aviso';
    const paso = pasoActual();
    let cuerpo = hayMensaje ? mensaje : indicacion();
    if (!hayMensaje && nivel === 'guiada' && paso <= N_PASOS) cuerpo = cuerpo.replace(/^[^:]{1,16}:\s+/, '');
    cuerpo = cuerpo.replace(/^⚠\s*/, '');
    const etiqueta = esAviso ? i18n.t('AVISO')
        : nivel === 'libre' ? i18n.t('NIVEL LIBRE')
        : paso <= N_PASOS ? i18n.t('PASO {n} DE {t}', { n: paso, t: N_PASOS })
        : i18n.t('PRÁCTICA TERMINADA');
    const cabecera = movil && !esAviso
        ? etiqueta + ' · ' + i18n.t('MONTAJE {n} · {c} mL · {t} °C', { n: montaje.n, c: capJeringa, t: montaje.tSala })
        : etiqueta;

    const tp = tamTexto(13);
    textSize(tp);
    textStyle(NORMAL);
    const txtP = i18n.t('Montaje {n} · jeringa de {c} mL · sala a {t} °C', { n: montaje.n, c: capJeringa, t: montaje.tSala });
    const wP = textWidth(txtP) + 26, hP = tp + 14;

    const tt = tamTexto(15), te = tamTexto(11);
    const wC = movil ? CV_W - 2 * m : CV_W - 3 * m - wP;
    const sangria = esAviso ? te * 1.9 : 0;
    textSize(tt);
    const lineas = envolver(cuerpo, wC - 32);
    const hC = 14 + te + 9 + lineas.length * tt * 1.32 + 8;
    stroke(esAviso ? TH.aviso : TH.tarjetaBorde);
    strokeWeight(esAviso ? 1.6 : 1);
    fill(TH.tarjeta);
    rect(m, m, wC, hC, 8);
    noStroke();
    if (esAviso) {
        fill(TH.aviso);
        circle(m + 16 + te * 0.7, m + 14 + te * 0.5, te * 1.4);
        fill(TH.fondo);
        textSize(te);
        textStyle(BOLD);
        textAlign(CENTER, CENTER);
        text('!', m + 16 + te * 0.7, m + 14 + te * 0.55);
    }
    fill(esAviso ? TH.aviso : TH.acento);
    textSize(te);
    textStyle(BOLD);
    textAlign(LEFT, TOP);
    espaciado(1.4);
    text(cabecera, m + 16 + sangria, m + 14);
    espaciado(0);
    textStyle(NORMAL);
    fill(TH.texto);
    textSize(tt);
    lineas.forEach((l, i) => text(l, m + 16, m + 14 + te + 9 + i * tt * 1.32));

    // En el móvil no cabe la pastilla: el montaje va en la cabecera de la tarjeta
    if (movil) return;
    const xP = CV_W - m - wP;
    const yP = m;
    stroke(TH.tarjetaBorde);
    strokeWeight(1);
    fill(TH.pastilla);
    rect(xP, yP, wP, hP, hP / 2);
    noStroke();
    fill(TH.texto);
    textSize(tp);
    textAlign(CENTER, CENTER);
    text(txtP, xP + wP / 2, yP + hP / 2 + 0.5);
}

function tamTexto(base) {
    return constrain(base * 0.7 / escala, base, base * 1.9);
}

// ═══════════════════════════════════════════════════════════════════
//  RATÓN, DEDO Y TECLADO
// ═══════════════════════════════════════════════════════════════════
function puntoLienzo(e, cv) {
    const r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * CV_W / r.width, y: (e.clientY - r.top) * CV_H / r.height };
}

function sobreLupa(q) {
    const r = radioLupa();
    const enAro = dist(q.x, q.y, lupaPos.x, lupaPos.y) < r;
    const t = ((q.x - lupaPos.x) + (q.y - lupaPos.y)) / 2;
    const enMango = t > r * 0.6 && t < r * 1.35 && Math.abs((q.x - lupaPos.x) - (q.y - lupaPos.y)) < 18;
    return enAro || enMango;
}

// El mango del émbolo y la palanca son pequeños: en pantallas pequeñas la zona que responde crece
function sobreMango(q) {
    const extra = Math.max(6, 16 / escala - 10);
    return q.x > xMango() - extra && q.x < xMango() + 10 + extra && Math.abs(q.y - EJE) < 30 + extra;
}

function sobreLlave(q) {
    const extra = Math.max(4, 14 / escala - 10);
    const y0 = llaveAbierta ? EJE - 46 : EJE - 10;
    return Math.abs(q.x - LLAVE.x) < 14 + extra && q.y > y0 - extra && q.y < y0 + 56 + extra;
}

function setupPuntero(cv) {
    cv.style.touchAction = 'none';

    cv.addEventListener('pointermove', (e) => { punteroTipo = e.pointerType; });
    cv.addEventListener('pointerdown', (e) => {
        punteroTipo = e.pointerType;
        if (bloqueado) return;
        const q = puntoLienzo(e, cv);
        if (sobreLupa(q)) {
            const r = radioLupa();
            arrastre = e.pointerType === 'touch'
                ? { que: 'lupa', dx: -r * 1.05, dy: -r * 1.05 }
                : { que: 'lupa', dx: lupaPos.x - q.x, dy: lupaPos.y - q.y };
            lupaPos.x = constrain(q.x + arrastre.dx, 0, CV_W);
            lupaPos.y = constrain(q.y + arrastre.dy, 0, MESA_Y);
        } else if (sobreMango(q)) {
            arrastre = { que: 'embolo', dx: xMango() - q.x };
            vObjetivo = null;
        } else if (sobreLlave(q)) {
            pulsarLlave();
            return;
        } else {
            return;
        }
        cv.setPointerCapture(e.pointerId);
        e.preventDefault();
    });

    cv.addEventListener('pointermove', (e) => {
        if (!arrastre) return;
        const q = puntoLienzo(e, cv);
        if (arrastre.que === 'lupa') {
            lupaPos.x = constrain(q.x + arrastre.dx, 0, CV_W);
            lupaPos.y = constrain(q.y + arrastre.dy, 0, MESA_Y);
        } else {
            const j = jeringa();
            const xm = constrain(q.x + arrastre.dx, 0, CV_W - 12);
            V = constrain((xm - GOMA_W - VASTAGO - X0) / j.pxMl, j.div, capJeringa + 2.5);
        }
    });

    const terminar = () => {
        if (!arrastre) return;
        const a = arrastre;
        arrastre = null;
        if (a.que === 'embolo') encajar();
        actualizarInterfaz();
    };
    cv.addEventListener('pointerup', terminar);
    cv.addEventListener('pointercancel', terminar);

    // Flechas: mueven la lupa (Mayús para ir más deprisa). Av Pág / Re Pág: el émbolo
    cv.addEventListener('keydown', (e) => {
        if (bloqueado) return;
        if (e.key === 'PageUp' || e.key === '-') { e.preventDefault(); moverEmbolo(-1); return; }
        if (e.key === 'PageDown' || e.key === '+') { e.preventDefault(); moverEmbolo(1); return; }
        const paso = e.shiftKey ? 20 : 4;
        const d = { ArrowUp: [0, -paso], ArrowDown: [0, paso], ArrowLeft: [-paso, 0], ArrowRight: [paso, 0] }[e.key];
        if (!d) return;
        e.preventDefault();
        lupaPos.x = constrain(lupaPos.x + d[0], 0, CV_W);
        lupaPos.y = constrain(lupaPos.y + d[1], 0, MESA_Y);
    });
}

function actualizarCursor() {
    const cv = document.querySelector('#canvas-container canvas');
    if (!cv) return;
    let c = 'default';
    if (arrastre) c = 'grabbing';
    else {
        const q = { x: mouseX, y: mouseY };
        if (sobreLlave(q)) c = 'pointer';
        else if (sobreLupa(q) || sobreMango(q)) c = 'grab';
    }
    if (cv.style.cursor !== c) cv.style.cursor = c;
}

// ═══════════════════════════════════════════════════════════════════
//  TAMAÑO DEL CANVAS
// ═══════════════════════════════════════════════════════════════════
function fitCanvas() {
    const cont = document.getElementById('canvas-container');
    const cv = cont.querySelector('canvas');
    if (!cv) return;
    const cs = getComputedStyle(cont);
    const w = cont.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const apilado = window.matchMedia('(max-width: 1100px)').matches;
    const h = apilado ? Infinity : cont.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const s = Math.max(0.1, Math.min(w / CV_W, h / CV_H));
    escala = s;
    cv.style.width  = Math.floor(CV_W * s) + 'px';
    cv.style.height = Math.floor(CV_H * s) + 'px';
}

function windowResized() { fitCanvas(); }

// ═══════════════════════════════════════════════════════════════════
//  TEMAS (oscuro · claro · alto contraste)
// ═══════════════════════════════════════════════════════════════════
const CLAVE_TEMA = 'sim-practica-boyle-tema';

function setupThemeSelector() {
    const themeBtn   = document.getElementById('theme-btn');
    const themePanel = document.getElementById('theme-panel');
    const themeOpts  = document.querySelectorAll('.theme-opt');

    const closePanel = () => {
        themePanel.classList.remove('open');
        themePanel.setAttribute('aria-hidden', 'true');
        themeBtn.classList.remove('active');
        themeBtn.setAttribute('aria-expanded', 'false');
    };

    const aplicar = (theme) => {
        document.body.classList.remove('theme-light', 'theme-contrast');
        if (theme !== 'dark') document.body.classList.add('theme-' + theme);
        themeOpts.forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
    };

    themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = themePanel.classList.toggle('open');
        themeBtn.classList.toggle('active', isOpen);
        themeBtn.setAttribute('aria-expanded', String(isOpen));
        themePanel.setAttribute('aria-hidden', String(!isOpen));
    });

    document.addEventListener('click', (e) => {
        if (!themeBtn.contains(e.target) && !themePanel.contains(e.target)) closePanel();
    });

    themeOpts.forEach(btn => {
        btn.addEventListener('click', () => {
            aplicar(btn.dataset.theme);
            try { localStorage.setItem(CLAVE_TEMA, btn.dataset.theme); } catch (e) { /* sin almacenamiento */ }
            closePanel();
        });
    });

    try {
        const guardado = localStorage.getItem(CLAVE_TEMA);
        if (guardado === 'light' || guardado === 'contrast') aplicar(guardado);
    } catch (e) { /* sin almacenamiento */ }
}

function updateTheme() {
    const isLight    = document.body.classList.contains('theme-light');
    const isContrast = document.body.classList.contains('theme-contrast');

    if (isLight) {
        TH = {
            fondo: '#e2e8f0', pared1: '#f1f4f8', pared2: '#e2e8f0', luzPared: 'rgba(255,255,255,0.45)',
            encimeraCanto: '#9eabbd', encimeraFrente: '#c4cdda', mesa: '#d3dae4', sombraCanto: 'rgba(40,55,80,0.12)', sombra: 'rgba(40,55,80,0.22)',
            texto: '#0d1520', textoTenue: '#46556e', acento: '#00628e', aviso: '#9a5a00',
            pies: '#5a6578', soporte: '#7d8797', metal: '#e1e6ee', metalLuz: '#ffffff', metalBorde: '#7d8aa0',
            esfera: '#ffffff', esferaBorde: '#9aa3b2', tinta: '#1a2236', tintaTenue: '#5a6474', aguja: '#c62828', eje: '#3a4150', franja: '#d33',
            tubo: '#f4f6fa', tuboBorde: '#9aa3b2', llave: '#f2f4f7',
            vidrio: '#5a6a84', vidrioFondo: 'rgba(255,255,255,0.45)', raya: '#1a2236', brillo: 'rgba(255,255,255,0.75)',
            aireDentro: 'rgba(120,160,220,0.08)', goma: '#2a2f3a', gomaRaya: '#4a5262', vastago: '#f2f4f7',
            pantalla: '#10241a', pantallaTexto: '#5ef0a8',
            contraste: false,
            aro: '#7d8797', aroLuz: '#dfe4ea', aroSombra: 'rgba(30,40,60,0.3)', empunadura: '#0088bb', empunaduraLuz: 'rgba(255,255,255,0.45)',
            tarjeta: 'rgba(255,255,255,0.92)', tarjetaBorde: '#c3ccd9', pastilla: 'rgba(255,255,255,0.92)',
        };
    } else if (isContrast) {
        TH = {
            fondo: '#000000', pared1: '#000000', pared2: '#000000',
            encimeraCanto: '#ffff00', encimeraFrente: '#000000', mesa: '#000000', sombraCanto: '#000000', sombra: 'rgba(0,0,0,0)',
            texto: '#ffffff', textoTenue: '#ffffff', acento: '#00ffff', aviso: '#ffaa00',
            pies: '#ffffff', soporte: '#ffffff', metal: '#000000', metalLuz: '#000000', metalBorde: '#ffffff',
            esfera: '#000000', esferaBorde: '#ffffff', tinta: '#ffffff', tintaTenue: '#ffffff', aguja: '#ff4444', eje: '#ffffff', franja: '#ff4444',
            tubo: '#000000', tuboBorde: '#ffffff', llave: '#000000',
            vidrio: '#ffffff', vidrioFondo: 'rgba(255,255,255,0.06)', raya: '#ffffff', brillo: 'rgba(255,255,255,0)',
            aireDentro: 'rgba(0,0,0,0)', goma: '#ffffff', gomaRaya: '#000000', vastago: '#000000',
            pantalla: '#000000', pantallaTexto: '#00ff88',
            contraste: true,
            aro: '#ffffff', aroLuz: '#ffffff', aroSombra: '#000000', empunadura: '#00ffff', empunaduraLuz: '#000000',
            tarjeta: '#000000', tarjetaBorde: '#ffff00', pastilla: '#000000',
        };
    } else {
        TH = {
            fondo: '#0d1016', pared1: '#161b24', pared2: '#0d1016', luzPared: 'rgba(120,150,200,0.07)',
            encimeraCanto: '#46526a', encimeraFrente: '#1f2633', mesa: '#141922', sombraCanto: 'rgba(0,0,0,0.35)', sombra: 'rgba(0,0,0,0.4)',
            texto: '#d8dee8', textoTenue: '#8d9ab3', acento: '#00c8ff', aviso: '#f0a832',
            pies: '#3a4150', soporte: '#566074', metal: '#c3cad6', metalLuz: '#eef1f5', metalBorde: '#8d95a5',
            esfera: '#f4f6fa', esferaBorde: '#9aa2b0', tinta: '#1d2430', tintaTenue: '#5a6474', aguja: '#c62828', eje: '#3a4150', franja: '#d33',
            tubo: '#dfe5ee', tuboBorde: '#8d95a5', llave: '#e8ecf2',
            vidrio: '#c8d4e6', vidrioFondo: 'rgba(200,212,230,0.06)', raya: '#e4ecf8', brillo: 'rgba(255,255,255,0.16)',
            aireDentro: 'rgba(150,190,240,0.05)', goma: '#4a5263', gomaRaya: '#2a303b', vastago: '#dfe5ee',
            pantalla: '#0c1712', pantallaTexto: '#5ef0a8',
            contraste: false,
            aro: '#9aa4b2', aroLuz: '#e6ebf2', aroSombra: 'rgba(0,0,0,0.45)', empunadura: '#00c8ff', empunaduraLuz: 'rgba(255,255,255,0.45)',
            tarjeta: 'rgba(22,27,36,0.92)', tarjetaBorde: '#2c3546', pastilla: 'rgba(22,27,36,0.92)',
        };
    }
}
