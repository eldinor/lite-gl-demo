import { applyEffectWrapper, createDynamicTexture, createEffectWrapper, createGLEngine, drawEffect, isEffectReady, resizeGLEngine, runRenderLoop, setEffectFloat, setEffectFloat2, setEffectTexture, setHardwareScalingLevel, setViewport, updateDynamicTexture } from "@babylonjs/lite-gl";
import "./texture-demo.css";
import "./typography.css";
import "./texture-modes.css";
import { BRAND_HTML, PACKAGE_LINK_HTML } from "./brand";

const app = document.querySelector<HTMLDivElement>("#textureApp");
if (!app) throw new Error("Missing #textureApp");
const isTextureGallery = app.dataset.page === "gallery";
const modeControl = isTextureGallery
  ? `<label class="mode-control"><span>Example</span><select id="textureMode"><option value="kaleido">Kaleido Bloom</option><option value="weave">Chromatic Weave</option></select></label>`
  : `<input id="textureMode" type="hidden" value="surface" />`;
const initialTitle = isTextureGallery ? "Kaleido<br/>Bloom" : "Living<br/>Surface";
const initialDescription = isTextureGallery
  ? "A live procedural canvas is folded into twelve mirrored sectors, refracted, and split into spectral channels."
  : "A Canvas 2D poster is redrawn and uploaded to the GPU every frame, then refracted through a custom shader.";
app.innerHTML = `
  <div class="texture-shell">
    <header>
      ${BRAND_HTML}<span class="badge"><i></i> WebGL2</span>
      <nav><a href="/shaders.html">Shaders</a><a href="/feedback.html">Feedback</a><a href="/particles.html">Particles</a><a href="/geometry.html">Geometry</a><a href="/texture.html" ${isTextureGallery ? 'aria-current="page"' : ""}>Texture</a>${isTextureGallery ? "" : '<a href="/header-network-plot.html">Sample Cover</a>'}</nav>${PACKAGE_LINK_HTML}
    </header>
    <main>
      <canvas id="textureCanvas"></canvas>
      <section class="copy"><span>${isTextureGallery ? "Demo 06 · Texture sampling" : "Demo 05 · Dynamic texture"}</span><h1 id="textureTitle">${initialTitle}</h1><p id="textureDescription">${initialDescription}</p></section>
      <aside>${modeControl}<label class="text-control"><span>Poster text</span><input id="posterText" value="LITE-GL" maxlength="18"/></label><label><span>Refraction</span><input id="warpControl" type="range" min="0" max="0.12" value="0.052" step="0.002"/><output id="warpOutput">0.052</output></label><div><b>512²</b><span>Canvas source</span><b>Live</b><span>GPU upload</span></div></aside>
      <div class="hint">Move the pointer to refract the surface</div>
      <div class="path"><span>Canvas 2D</span><i>→</i><span>updateDynamicTexture</span><i>→</i><span id="samplingLabel">${isTextureGallery ? "Polar mirror sampling" : "Refracted sampling"}</span></div>
    </main>
  </div>`;

const SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform sampler2D uPoster;
uniform vec2 uMouse;
uniform float uTime;
uniform float uWarp;
uniform float uMode;
void main() {
    vec2 sampleUv = vUv;
    if (uMode > 1.5) {
        vec2 weave = vUv - 0.5;
        float angle = uTime * 0.08 + (uMouse.x - 0.5) * 0.6;
        weave = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * weave;
        weave += 0.055 * sin(weave.yx * 14.0 + uTime * vec2(0.7, -0.55));
        sampleUv = abs(fract(weave * 2.7 + 0.5) * 2.0 - 1.0);
    } else if (uMode > 0.5) {
        vec2 kaleido = vUv - 0.5;
        float kaleidoRadius = length(kaleido);
        float slice = 6.283185 / 12.0;
        float angle = atan(kaleido.y, kaleido.x) + uTime * 0.12;
        angle = abs(mod(angle + slice * 0.5, slice) - slice * 0.5);
        sampleUv = 0.5 + vec2(cos(angle), sin(angle)) * kaleidoRadius * 1.32;
        sampleUv += 0.018 * sin(sampleUv.yx * 18.0 + uTime);
    }
    vec2 p = vUv - uMouse;
    float radius = length(p);
    float ripple = sin(radius * 34.0 - uTime * 3.2) * exp(-radius * 3.4);
    vec2 direction = radius > 0.001 ? p / radius : vec2(0.0);
    vec2 offset = direction * ripple * uWarp;
    float split = 0.004 + abs(ripple) * 0.006;
    float r = texture(uPoster, clamp(sampleUv + offset + direction * split, 0.0, 1.0)).r;
    float g = texture(uPoster, clamp(sampleUv + offset, 0.0, 1.0)).g;
    float b = texture(uPoster, clamp(sampleUv + offset - direction * split, 0.0, 1.0)).b;
    vec3 color = vec3(r, g, b);
    color += pow(max(0.0, ripple), 12.0) * vec3(0.4, 0.75, 1.0);
    vec2 edge = smoothstep(vec2(0.0), vec2(0.08), vUv) * smoothstep(vec2(0.0), vec2(0.08), 1.0 - vUv);
    color *= edge.x * edge.y;
    glFragColor = vec4(color, 1.0);
}`;

const canvas = document.querySelector<HTMLCanvasElement>("#textureCanvas")!;
const modeSelect = document.querySelector<HTMLInputElement | HTMLSelectElement>("#textureMode")!;
const textInput = document.querySelector<HTMLInputElement>("#posterText")!;
const warpControl = document.querySelector<HTMLInputElement>("#warpControl")!;
const warpOutput = document.querySelector<HTMLOutputElement>("#warpOutput")!;
const textureTitle = document.querySelector<HTMLElement>("#textureTitle")!;
const textureDescription = document.querySelector<HTMLParagraphElement>("#textureDescription")!;
const samplingLabel = document.querySelector<HTMLElement>("#samplingLabel")!;
const surface = document.createElement("canvas");
surface.width = surface.height = 512;
const context = surface.getContext("2d")!;
const engine = createGLEngine(canvas, { alpha: false, antialias: false });
setHardwareScalingLevel(engine, 1 / Math.min(devicePixelRatio || 1, 1.5));
const texture = createDynamicTexture(engine, 512, 512, { minFilter: engine.gl.LINEAR, magFilter: engine.gl.LINEAR });
const effect = createEffectWrapper(engine, { name: "living-surface", fragmentSource: SHADER, uniformNames: ["uMouse", "uTime", "uWarp", "uMode"], samplerNames: ["uPoster"] });
let time = 0;
let previousTime = performance.now();
let mouseX = 0.5;
let mouseY = 0.5;
canvas.addEventListener("pointermove", (event) => { const rect = canvas.getBoundingClientRect(); mouseX = (event.clientX - rect.left) / rect.width; mouseY = 1 - (event.clientY - rect.top) / rect.height; });
warpControl.addEventListener("input", () => { warpOutput.value = Number(warpControl.value).toFixed(3); });
modeSelect.addEventListener("change", () => {
  const kaleido = modeSelect.value === "kaleido";
  const weave = modeSelect.value === "weave";
  textureTitle.innerHTML = weave ? "Chromatic<br/>Weave" : kaleido ? "Kaleido<br/>Bloom" : "Living<br/>Surface";
  textureDescription.textContent = weave
    ? "Animated Canvas 2D ribbons are tiled, mirrored, and refracted into a luminous woven material."
    : kaleido
      ? "A live procedural canvas is folded into twelve mirrored sectors, refracted, and split into spectral channels."
      : "A Canvas 2D poster is redrawn and uploaded to the GPU every frame, then refracted through a custom shader.";
  samplingLabel.textContent = weave ? "Mirrored tile sampling" : kaleido ? "Polar mirror sampling" : "Refracted sampling";
});

const requestedTexture = new URLSearchParams(location.search).get("texture");
if (isTextureGallery && (requestedTexture === "kaleido" || requestedTexture === "weave")) {
  modeSelect.value = requestedTexture;
  modeSelect.dispatchEvent(new Event("change"));
}

function drawKaleido(t: number): void {
  context.fillStyle = "#030713";
  context.fillRect(0, 0, 512, 512);
  context.save();
  context.translate(256, 256);
  context.globalCompositeOperation = "screen";
  for (let i = 0; i < 18; i++) {
    const angle = i / 18 * Math.PI * 2 + t * (0.08 + (i % 3) * 0.018);
    const distance = 55 + (i % 6) * 31 + Math.sin(t * 0.7 + i) * 18;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const radius = 18 + (i % 5) * 8;
    const glow = context.createRadialGradient(x, y, 0, x, y, radius * 2.8);
    glow.addColorStop(0, `hsla(${165 + i * 17 + t * 18},100%,70%,.9)`);
    glow.addColorStop(0.25, `hsla(${205 + i * 13},95%,55%,.45)`);
    glow.addColorStop(1, "transparent");
    context.fillStyle = glow;
    context.fillRect(x - radius * 3, y - radius * 3, radius * 6, radius * 6);
  }
  context.rotate(-t * 0.13);
  for (let i = 0; i < 8; i++) {
    context.rotate(Math.PI / 4);
    context.strokeStyle = `hsla(${190 + i * 25},100%,70%,.28)`;
    context.lineWidth = 2 + (i % 2) * 2;
    context.strokeRect(42 + i * 10, 42 + i * 10, 105 + i * 13, 105 + i * 13);
  }
  context.restore();
  context.globalCompositeOperation = "source-over";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "700 34px Arial, sans-serif";
  context.fillStyle = "rgba(245,250,244,.9)";
  context.fillText(textInput.value.toUpperCase() || "LITE-GL", 256, 256, 390);
}

function drawWeave(t: number): void {
  const background = context.createLinearGradient(0, 0, 512, 512);
  background.addColorStop(0, "#020817");
  background.addColorStop(0.5, "#16103d");
  background.addColorStop(1, "#041a22");
  context.fillStyle = background;
  context.fillRect(0, 0, 512, 512);
  context.save();
  context.globalCompositeOperation = "screen";
  context.translate(256, 256);
  for (let layer = 0; layer < 16; layer++) {
    const offset = (layer - 7.5) * 25;
    context.beginPath();
    for (let x = -380; x <= 380; x += 8) {
      const y = offset + Math.sin(x * 0.018 + t * (0.7 + layer * 0.018) + layer) * (24 + layer % 4 * 9);
      if (x === -380) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = `hsla(${165 + layer * 15 + t * 15},100%,65%,${0.28 + (layer % 3) * 0.1})`;
    context.lineWidth = 3 + (layer % 4);
    context.shadowColor = `hsl(${180 + layer * 15},100%,60%)`;
    context.shadowBlur = 14;
    context.stroke();
  }
  context.rotate(Math.PI / 2);
  for (let layer = 0; layer < 11; layer++) {
    const offset = (layer - 5) * 38;
    context.beginPath();
    context.moveTo(-360, offset + Math.sin(t + layer) * 20);
    context.bezierCurveTo(-120, offset - 80, 120, offset + 80, 360, offset + Math.cos(t + layer) * 20);
    context.strokeStyle = `hsla(${250 + layer * 12},100%,68%,.24)`;
    context.lineWidth = 2 + layer % 3;
    context.stroke();
  }
  context.restore();
  context.shadowBlur = 0;
  context.globalCompositeOperation = "source-over";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "700 42px Arial, sans-serif";
  context.fillStyle = "rgba(245,250,244,.9)";
  context.fillText(textInput.value.toUpperCase() || "LITE-GL", 256, 256, 410);
}

function drawPoster(t: number): void {
  if (modeSelect.value === "weave") {
    drawWeave(t);
    return;
  }
  if (modeSelect.value === "kaleido") {
    drawKaleido(t);
    return;
  }
  const gradient = context.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, "#100832"); gradient.addColorStop(0.48, "#3a0b62"); gradient.addColorStop(1, "#071d3c");
  context.fillStyle = gradient; context.fillRect(0, 0, 512, 512);
  context.save(); context.translate(256, 256); context.rotate(Math.sin(t * 0.18) * 0.12);
  for (let i = 0; i < 14; i++) {
    const radius = 35 + i * 22 + Math.sin(t * 0.8 + i) * 8;
    context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * (0.55 + i * 0.13) + t * 0.18);
    context.strokeStyle = `hsla(${175 + i * 13 + t * 10}, 95%, 65%, ${0.18 + i * 0.018})`;
    context.lineWidth = 2 + (i % 3); context.stroke();
  }
  context.restore();
  context.globalCompositeOperation = "screen";
  for (let i = 0; i < 7; i++) {
    const x = 256 + Math.cos(t * (0.3 + i * 0.02) + i) * (90 + i * 18);
    const y = 256 + Math.sin(t * (0.38 + i * 0.03) + i * 1.7) * (75 + i * 13);
    const glow = context.createRadialGradient(x, y, 0, x, y, 55 + i * 6);
    glow.addColorStop(0, `hsla(${180 + i * 24},100%,70%,.34)`); glow.addColorStop(1, "transparent");
    context.fillStyle = glow; context.fillRect(0, 0, 512, 512);
  }
  context.globalCompositeOperation = "source-over";
  context.textAlign = "center"; context.textBaseline = "middle"; context.font = "700 68px Arial, sans-serif";
  context.fillStyle = "rgba(245,250,244,.94)"; context.fillText(textInput.value.toUpperCase() || "LITE-GL", 256, 246, 440);
  context.font = "500 13px monospace"; context.fillStyle = "rgba(217,255,102,.9)"; context.fillText("DYNAMIC TEXTURE · LIVE GPU SURFACE", 256, 304);
  context.strokeStyle = "rgba(255,255,255,.18)"; context.strokeRect(26.5, 26.5, 459, 459);
}

runRenderLoop(engine, () => {
  const now = performance.now(); const delta = Math.min((now - previousTime) / 1000, 0.05); previousTime = now; time += delta;
  resizeGLEngine(engine); drawPoster(time); updateDynamicTexture(engine, texture, surface, true, false);
  if (!isEffectReady(engine, effect.effect)) return;
  const mode = modeSelect.value === "weave" ? 2 : modeSelect.value === "kaleido" ? 1 : 0;
  setViewport(engine); applyEffectWrapper(effect); setEffectTexture(engine, effect.effect, "uPoster", texture); setEffectFloat2(engine, effect.effect, "uMouse", mouseX, mouseY); setEffectFloat(engine, effect.effect, "uTime", time); setEffectFloat(engine, effect.effect, "uWarp", Number(warpControl.value)); setEffectFloat(engine, effect.effect, "uMode", mode); drawEffect(engine);
});
