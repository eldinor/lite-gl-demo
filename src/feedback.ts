import {
  applyEffectWrapper,
  bindRenderTarget,
  clearEngine,
  createEffectWrapper,
  createGLEngine,
  createPingPong,
  drawEffect,
  isEffectReady,
  resizeGLEngine,
  resizePingPong,
  runRenderLoop,
  setEffectFloat,
  setEffectFloat2,
  setEffectFloat4,
  setEffectTexture,
  setHardwareScalingLevel,
  setViewport,
} from "@babylonjs/lite-gl";
import "./feedback.css";
import "./typography.css";
import { BRAND_HTML, PACKAGE_LINK_HTML } from "./brand";

const app = document.querySelector<HTMLDivElement>("#feedbackApp");
if (!app) throw new Error("Missing #feedbackApp");

app.innerHTML = `
  <div class="feedback-shell">
    <header>
      ${BRAND_HTML}
      <span class="badge"><i></i> WebGL2</span>
      <nav>
        <a href="/shaders.html">Shader gallery</a>
        <a href="/feedback.html" aria-current="page">Feedback ink</a>
        <a href="/particles.html">Particles</a>
        <a href="/geometry.html">Geometry</a>
        <a href="/texture.html">Texture</a>
      </nav>
      ${PACKAGE_LINK_HTML}
    </header>

    <main>
      <canvas id="feedbackCanvas"></canvas>
      <div class="wash"></div>

      <section class="intro">
        <span class="eyebrow">Demo 02 · Render targets</span>
        <h1>Feedback<br />Ink</h1>
        <p>Drag across the canvas. Every frame reads the last one, diffuses it, and paints the result back into a second texture.</p>
      </section>

      <section class="pipeline" aria-label="Rendering pipeline">
        <div><b>01</b><span>Read texture</span></div>
        <i>→</i>
        <div><b>02</b><span>Diffuse + inject</span></div>
        <i>→</i>
        <div><b>03</b><span>Swap targets</span></div>
      </section>

      <aside class="controls">
        <div class="control-heading">
          <div><span class="live-dot"></span><b id="stateLabel">Auto painting</b></div>
          <span id="resolutionLabel">—</span>
        </div>
        <label>
          <span>Persistence</span>
          <input id="decayControl" type="range" min="0.965" max="0.999" value="0.992" step="0.001" />
          <output id="decayOutput">99.2%</output>
        </label>
        <label>
          <span>Brush size</span>
          <input id="radiusControl" type="range" min="0.008" max="0.09" value="0.035" step="0.001" />
          <output id="radiusOutput">3.5%</output>
        </label>
        <div class="buttons">
          <button id="clearButton">Clear</button>
          <button id="pauseButton" class="primary">Pause simulation</button>
        </div>
      </aside>

      <div class="capabilities">
        <span>2× RGBA8 targets</span><span>2 shader passes</span><span>GPU feedback</span>
      </div>
    </main>
  </div>
`;

const UPDATE_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform sampler2D uPrevious;
uniform vec2 uResolution;
uniform vec4 uPointer;
uniform float uPointerDown;
uniform float uTime;
uniform float uDecay;
uniform float uRadius;

float segmentDistance(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.00001), 0.0, 1.0);
    return length(pa - ba * h);
}

vec3 palette(float t) {
    return 0.55 + 0.45 * cos(6.28318 * (t + vec3(0.02, 0.25, 0.52)));
}

void main() {
    vec2 texel = 1.0 / uResolution;
    vec2 velocity = uPointer.xy - uPointer.zw;
    vec2 toBrush = vUv - uPointer.xy;
    float influence = exp(-dot(toBrush, toBrush) / 0.055);
    vec2 swirl = vec2(-toBrush.y, toBrush.x) * influence * 0.006;
    vec2 sampleUv = clamp(vUv - velocity * influence * 0.72 - swirl, 0.0, 1.0);

    vec3 center = texture(uPrevious, sampleUv).rgb;
    vec3 neighbors = texture(uPrevious, sampleUv + vec2(texel.x, 0.0)).rgb;
    neighbors += texture(uPrevious, sampleUv - vec2(texel.x, 0.0)).rgb;
    neighbors += texture(uPrevious, sampleUv + vec2(0.0, texel.y)).rgb;
    neighbors += texture(uPrevious, sampleUv - vec2(0.0, texel.y)).rgb;
    vec3 ink = mix(center, neighbors * 0.25, 0.075) * uDecay;

    float distanceToStroke = segmentDistance(vUv, uPointer.zw, uPointer.xy);
    float brush = exp(-distanceToStroke * distanceToStroke / max(uRadius * uRadius, 0.00001));
    brush *= uPointerDown;
    float hue = uTime * 0.045 + uPointer.x * 0.28 + uPointer.y * 0.18;
    vec3 freshInk = palette(hue) * brush * (0.62 + length(velocity) * 9.0);
    ink = max(ink, freshInk);

    glFragColor = vec4(clamp(ink, 0.0, 1.0), 1.0);
}`;

const DISPLAY_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform sampler2D uInk;
uniform float uTime;

void main() {
    vec3 ink = texture(uInk, vUv).rgb;
    vec2 p = vUv * 2.0 - 1.0;
    float vignette = 1.0 - 0.22 * dot(p, p);
    vec3 background = vec3(0.0035, 0.005, 0.009);
    float glow = max(ink.r, max(ink.g, ink.b));
    vec3 color = background + pow(ink, vec3(0.82)) * vignette;
    color += glow * glow * ink * 0.32;
    color += 0.006 * sin(uTime * 0.2 + vUv.xyx * vec3(3.0, 4.0, 5.0));
    glFragColor = vec4(color, 1.0);
}`;

const canvas = document.querySelector<HTMLCanvasElement>("#feedbackCanvas")!;
const decayControl = document.querySelector<HTMLInputElement>("#decayControl")!;
const radiusControl = document.querySelector<HTMLInputElement>("#radiusControl")!;
const decayOutput = document.querySelector<HTMLOutputElement>("#decayOutput")!;
const radiusOutput = document.querySelector<HTMLOutputElement>("#radiusOutput")!;
const pauseButton = document.querySelector<HTMLButtonElement>("#pauseButton")!;
const stateLabel = document.querySelector<HTMLElement>("#stateLabel")!;
const resolutionLabel = document.querySelector<HTMLElement>("#resolutionLabel")!;

const engine = createGLEngine(canvas, { alpha: false, antialias: false });
setHardwareScalingLevel(engine, 1 / Math.min(devicePixelRatio || 1, 1.5));

const feedback = createPingPong(engine, { width: 2, height: 2 });
const updateEffect = createEffectWrapper(engine, {
  name: "feedback-update",
  fragmentSource: UPDATE_SHADER,
  uniformNames: ["uResolution", "uPointer", "uPointerDown", "uTime", "uDecay", "uRadius"],
  samplerNames: ["uPrevious"],
});
const displayEffect = createEffectWrapper(engine, {
  name: "feedback-display",
  fragmentSource: DISPLAY_SHADER,
  uniformNames: ["uTime"],
  samplerNames: ["uInk"],
});

let simWidth = 2;
let simHeight = 2;
let time = 0;
let previousTime = performance.now();
let playing = true;
let pointerDown = false;
let autoPaint = true;
let pointerX = 0.5;
let pointerY = 0.5;
let previousPointerX = 0.5;
let previousPointerY = 0.5;

function clearFeedback(): void {
  bindRenderTarget(engine, feedback.read);
  clearEngine(engine, { color: { r: 0, g: 0, b: 0, a: 1 } });
  bindRenderTarget(engine, feedback.write);
  clearEngine(engine, { color: { r: 0, g: 0, b: 0, a: 1 } });
  bindRenderTarget(engine, null);
}

function resizeSimulation(): void {
  const scale = Math.min(1, 960 / Math.max(canvas.width, canvas.height));
  const width = Math.max(2, Math.round(canvas.width * scale));
  const height = Math.max(2, Math.round(canvas.height * scale));
  if (width === simWidth && height === simHeight) return;
  simWidth = width;
  simHeight = height;
  resizePingPong(engine, feedback, width, height);
  clearFeedback();
  resolutionLabel.textContent = `${width} × ${height}`;
}

function updatePointer(event: PointerEvent): void {
  const rect = canvas.getBoundingClientRect();
  previousPointerX = pointerX;
  previousPointerY = pointerY;
  pointerX = (event.clientX - rect.left) / rect.width;
  pointerY = (rect.bottom - event.clientY) / rect.height;
}

canvas.addEventListener("pointerdown", (event) => {
  autoPaint = false;
  pointerDown = true;
  updatePointer(event);
  previousPointerX = pointerX;
  previousPointerY = pointerY;
  canvas.setPointerCapture(event.pointerId);
  stateLabel.textContent = "Painting";
});
canvas.addEventListener("pointermove", (event) => {
  if (pointerDown) updatePointer(event);
});
canvas.addEventListener("pointerup", () => {
  pointerDown = false;
  stateLabel.textContent = "Drag to paint";
});

decayControl.addEventListener("input", () => {
  decayOutput.value = `${(Number(decayControl.value) * 100).toFixed(1)}%`;
});
radiusControl.addEventListener("input", () => {
  radiusOutput.value = `${(Number(radiusControl.value) * 100).toFixed(1)}%`;
});
document.querySelector<HTMLButtonElement>("#clearButton")!.addEventListener("click", clearFeedback);
pauseButton.addEventListener("click", () => {
  playing = !playing;
  pauseButton.textContent = playing ? "Pause simulation" : "Resume simulation";
  stateLabel.textContent = playing ? (autoPaint ? "Auto painting" : "Drag to paint") : "Paused";
  previousTime = performance.now();
});

runRenderLoop(engine, () => {
  const now = performance.now();
  const delta = Math.min((now - previousTime) / 1000, 0.05);
  previousTime = now;
  if (playing) time += delta;

  resizeGLEngine(engine);
  resizeSimulation();

  if (!isEffectReady(engine, updateEffect.effect) || !isEffectReady(engine, displayEffect.effect)) return;

  if (autoPaint) {
    previousPointerX = pointerX;
    previousPointerY = pointerY;
    pointerX = 0.5 + Math.cos(time * 0.73) * 0.24 + Math.sin(time * 1.71) * 0.08;
    pointerY = 0.5 + Math.sin(time * 0.91) * 0.24;
  }

  if (playing) {
    bindRenderTarget(engine, feedback.write);
    applyEffectWrapper(updateEffect);
    setEffectTexture(engine, updateEffect.effect, "uPrevious", feedback.read.texture);
    setEffectFloat2(engine, updateEffect.effect, "uResolution", simWidth, simHeight);
    setEffectFloat4(engine, updateEffect.effect, "uPointer", pointerX, pointerY, previousPointerX, previousPointerY);
    setEffectFloat(engine, updateEffect.effect, "uPointerDown", autoPaint || pointerDown ? 1 : 0);
    setEffectFloat(engine, updateEffect.effect, "uTime", time);
    setEffectFloat(engine, updateEffect.effect, "uDecay", Number(decayControl.value));
    setEffectFloat(engine, updateEffect.effect, "uRadius", Number(radiusControl.value));
    drawEffect(engine);
    feedback.swap();
    previousPointerX = pointerX;
    previousPointerY = pointerY;
  }

  bindRenderTarget(engine, null);
  setViewport(engine);
  applyEffectWrapper(displayEffect);
  setEffectTexture(engine, displayEffect.effect, "uInk", feedback.read.texture);
  setEffectFloat(engine, displayEffect.effect, "uTime", time);
  drawEffect(engine);
});
