# Ley de Boyle-Mariotte — Simulación Interactiva

Práctica de laboratorio simulada para **Física y Química de 3.º de ESO**: el alumno encierra aire en
una **jeringa** con una **llave de tres vías**, cambia su volumen con el émbolo, lee la presión en un
**manómetro de aguja** y comprueba que, a temperatura constante, **P · V es constante**.

Es la segunda de la gama **Prácticas de laboratorio** de [simulaciencia.es](https://simulaciencia.es).

## Niveles

- **Guiada (paso a paso):** nueve pasos numerados y un cuaderno de laboratorio en pantalla con siete
  medidas (40, 35, 30, 25, 20, 50 y 60 mL). La simulación comprueba cada lectura y cada cálculo al
  apuntarlos, dibuja la gráfica P–V y P–1/V con los datos del alumno, le pide **predecir** la presión
  con 45 mL y comprobarla, y termina con una pregunta de partículas. Siempre usa la jeringa de 60 mL y
  el manómetro absoluto.
- **Libre (con guión en papel):** la simulación solo pone los instrumentos y el número de montaje. El
  alumno sigue un guión impreso y lo apunta todo en la hoja; no hay cuaderno ni corrección en pantalla.
  Se puede elegir la jeringa (60 mL, división de 1 mL, o 20 mL, división de 0,5 mL) y el manómetro
  (absoluto, de 0 a 200 kPa, o relativo, de −100 a 100 kPa, con un barómetro en la pared para pasar a
  presión absoluta).

## Cómo se maneja

- El **mango del émbolo** (cian) se arrastra con el ratón o con el dedo. En el nivel guiado encaja en
  cada mililitro al soltarlo.
- La **palanca de la llave** se pulsa. Apunta a la salida que cierra: **hacia arriba**, todo está
  abierto al aire de la sala; **hacia abajo**, el aire de la jeringa queda encerrado con el manómetro.
- La **lupa** se arrastra y amplía la aguja o la escala de la jeringa. El volumen se lee en el borde de
  la goma que toca el aire.
- Al mover el émbolo deprisa, el aire se calienta o se enfría un poco y la aguja **se pasa** y vuelve
  en unos segundos: hay que esperar a que se pare para leer.
- Errores que obligan a empezar de nuevo con el mismo montaje: pasar del final de la escala del
  manómetro (el tubo se suelta), sacar el émbolo de la jeringa y, en el nivel guiado, abrir la llave
  después de empezar a medir (el aire encerrado ya no es el mismo).
- En el móvil, unos botones bajo la mesa abren y cierran la llave y mueven el émbolo.
- **Con el teclado:** el tabulador lleva a unos botones que solo aparecen al recibir el foco (llave,
  empujar, tirar y llevar la lupa a cada instrumento). Con el lienzo enfocado, las flechas mueven la
  lupa y Av Pág y Re Pág (o − y +) mueven el émbolo. «Describir las escalas» dice dónde está la aguja y
  dónde está el émbolo.

## Criterio didáctico

- La simulación **nunca muestra la presión ni el volumen**: hay que leerlos en las escalas, con la lupa.
- Hay 12 montajes numerados. Cada número es siempre el mismo día de laboratorio: la presión atmosférica
  (la habitual en Madrid, de 93 a 96 kPa) y la temperatura de la sala. Al abrir la simulación sale uno al
  azar. La clave es P · V = Patm × V₀, con V₀ el volumen en el que se cierra la llave (40 mL en el nivel
  guiado).
- En el nivel guiado se da por bueno el volumen exacto y la presión a menos de media división (1 kPa).
  Con esas lecturas, P · V sale igual en todas las medidas con menos de un 3,5 % de diferencia.
- 1/V se pide en L⁻¹ (1000 / V con V en mL) para que la gráfica tenga números manejables.

## Uso

Abre `index.html` en un navegador. No necesita instalación ni conexión: incluye [p5.js](https://p5js.org/)
en `js/vendor/`. Incluye temas oscuro, claro y alto contraste (botón del engranaje).

Parámetros de la dirección, para repartir la práctica:

| Parámetro | Efecto |
|---|---|
| `?nivel=libre` | Abre el nivel libre |
| `?montaje=7` | Empieza con el montaje 7 (de 1 a 12); sin él, sale uno al azar |
| `?jeringa=20` | En el nivel libre, empieza con la jeringa de 20 mL |
| `?manometro=relativo` | En el nivel libre, empieza con el manómetro relativo y el barómetro |

Por ahora la interfaz solo está en español; las traducciones se harán con la versión definitiva.

## Estructura

| Archivo | Contenido |
|---|---|
| `index.html` | Panel de controles de los dos niveles |
| `css/style.css` | Estilos y temas (mismo sistema visual que el resto de simulaciones) |
| `css/practica.css` | Estilos propios: pasos, cuaderno, gráfica, pregunta y botones de los instrumentos |
| `js/montajes.js` | Los 12 montajes, las jeringas y los manómetros |
| `js/sketch.js` | Mesa de laboratorio, manómetro, llave, jeringa, lupa, física del aire, pasos y comprobaciones |
| `js/i18n.js`, `js/i18n-en.js`, `js/i18n-ca.js`, `js/i18n-eu.js`, `js/i18n-gl.js` | Idioma de la interfaz (diccionarios pendientes) |
