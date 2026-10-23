'use strict';
// ============================================================
//  Montajes de la práctica
//  Cada número es siempre el mismo día de laboratorio: la presión
//  atmosférica (la habitual en Madrid, a unos 650 m de altitud)
//  y la temperatura de la sala. La clave de la guía docente sale
//  de esta tabla: con V₀ mL iniciales, P·V = patm × V₀.
// ============================================================

const MONTAJES = [
    { n: 1,  patm: 94.6, tSala: 21 },
    { n: 2,  patm: 93.4, tSala: 22 },
    { n: 3,  patm: 95.2, tSala: 20 },
    { n: 4,  patm: 94.1, tSala: 23 },
    { n: 5,  patm: 95.8, tSala: 19 },
    { n: 6,  patm: 93.0, tSala: 24 },
    { n: 7,  patm: 94.9, tSala: 22 },
    { n: 8,  patm: 93.7, tSala: 20 },
    { n: 9,  patm: 95.5, tSala: 21 },
    { n: 10, patm: 94.3, tSala: 19 },
    { n: 11, patm: 96.0, tSala: 23 },
    { n: 12, patm: 93.9, tSala: 22 },
];

// Jeringas: capacidad, división y mililitros iniciales del nivel guiado / libre
const JERINGAS = {
    60: { cap: 60, div: 1,   inicio: 40, pxMl: 4,  numeros: 10 },
    20: { cap: 20, div: 0.5, inicio: 15, pxMl: 12, numeros: 5 },
};

// Manómetros: escala, división y si marcan la presión absoluta o la relativa
const MANOMETROS = {
    absoluto: { min: 0,    max: 200, div: 2, numeros: 20, absoluto: true },
    relativo: { min: -100, max: 100, div: 2, numeros: 20, absoluto: false },
};
