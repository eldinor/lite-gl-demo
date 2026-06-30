import {
  applyEffectWrapper,
  createEffectWrapper,
  createGLEngine,
  drawEffect,
  isEffectReady,
  resizeGLEngine,
  runRenderLoop,
  setEffectFloat,
  setEffectFloat2,
  setHardwareScalingLevel,
  setViewport,
} from "@babylonjs/lite-gl";
import "./header.css";

const app = document.querySelector<HTMLDivElement>("#headerApp");
if (!app) throw new Error("Missing #headerApp");
const isLightTheme = app.dataset.theme === "light";
const isNavEffect = app.dataset.effect?.startsWith("nav") ?? false;
const isPrismNav = app.dataset.effect === "nav-prism" || app.dataset.effect === "flow-prism";

app.innerHTML = `
  <div class="site-shell${isLightTheme ? " light-theme" : ""}${isNavEffect ? " nav-effect" : ""}${isPrismNav ? " nav-prism" : ""}">
    <canvas id="headerCanvas" aria-hidden="true"></canvas>
    <div class="noise" aria-hidden="true"></div>
    <header class="site-header">
      <a class="wordmark" href="#" aria-label="Northstar home">
        <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 1.5 19.7 12 30.5 16l-10.8 4L16 30.5 12.2 20 1.5 16l10.7-4L16 1.5Z"/><circle cx="16" cy="16" r="3.5"/></svg>
        <span>Northstar</span>
      </a>
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="siteNav"><span></span><span></span><span class="sr-only">Open menu</span></button>
      <nav id="siteNav" aria-label="Main navigation">
        <a href="#platform">Platform</a>
        <a href="#solutions">Solutions</a>
        <a href="#customers">Customers</a>
        <a href="#resources">Resources</a>
        <a href="#pricing">Pricing</a>
      </nav>
      <div class="header-actions">
        <a class="login" href="#login">Log in</a>
        <a class="start" href="#start">Start building <span>↗</span></a>
      </div>
    </header>

    <main class="hero">
      <div class="hero-copy">
        <a class="announcement" href="#release"><span>New</span> Spatial workflows are here <i>→</i></a>
        <p class="eyebrow">Intelligence for physical operations</p>
        <h1>See the whole field.<br/><em>Move as one.</em></h1>
        <p class="lede">Northstar brings live operations, asset data, and your team into one shared view—so every decision starts with the full picture.</p>
        <div class="hero-actions">
          <a class="primary" href="#demo">Book a demo <span>→</span></a>
          <a class="secondary" href="#overview"><i></i> Watch overview <small>2:14</small></a>
        </div>
      </div>
      <aside class="signal-card" aria-label="Live network sample data">
        <div class="signal-head"><span><i></i>Babylon Lite-GL</span><time>Dancing Meshes</time></div>
        <div class="signal-map" aria-hidden="true">
          <svg viewBox="0 0 420 190" preserveAspectRatio="none">
            <path class="route route-one" d="M-12 163C52 147 72 85 137 101s74 59 132 15 84-87 165-69"/>
            <path class="route route-two" d="M-8 118c68 11 94-51 153-38s74 78 137 61 81-63 151-55"/>
            <g class="nodes"><circle cx="59" cy="132" r="4"/><circle cx="137" cy="101" r="4"/><circle cx="238" cy="131" r="4"/><circle cx="337" cy="69" r="4"/></g>
          </svg>
          <span class="map-label label-a">Atlas 07</span><span class="map-label label-b">Relay 12</span><span class="map-label label-c">Field 04</span>
        </div>
        <div class="signal-stats"><div><small>Active assets</small><strong>2,481</strong><span>+12.4%</span></div><div><small>Uptime</small><strong>99.98%</strong><span>Nominal</span></div></div>
      </aside>
    </main>

    <footer class="proof"><span>Trusted in the field by</span><div><b>ARC//ONE</b><b>MONUMENT</b><b>VECTOR LABS</b><b>FIELDWORK</b></div><small>Scroll to explore <i>↓</i></small></footer>
  </div>`;

const canvas = document.querySelector<HTMLCanvasElement>("#headerCanvas")!;
const menuButton = document.querySelector<HTMLButtonElement>(".menu-button")!;
const nav = document.querySelector<HTMLElement>("#siteNav")!;
const siteHeader = document.querySelector<HTMLElement>(".site-header")!;

menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  nav.classList.toggle("open", !open);
});

const auroraShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotation = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = rotation * p * 2.03 + 9.7;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = vUv;
  vec2 p = (2.0 * uv - 1.0) * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  float time = uTime * 0.055;
  vec2 pointer = (uPointer - 0.5) * vec2(0.32, 0.18);
  vec2 flowUv = p * 0.66 + pointer;
  float base = fbm(flowUv + vec2(time, -time * 0.7));
  float detail = fbm(flowUv * 1.55 - vec2(time * 1.4, time * 0.5) + base * 1.8);
  float field = mix(base, detail, 0.58);

  float ribbonA = exp(-pow(abs(p.y + 0.12 - (field - 0.5) * 1.25), 2.0) * 4.5);
  float ribbonB = exp(-pow(abs(p.y - 0.38 + (detail - 0.5) * 0.82), 2.0) * 8.0);
  float contours = 1.0 - smoothstep(0.025, 0.075, abs(fract(field * 12.0) - 0.5));

  vec3 color = vec3(0.012, 0.035, 0.034);
  color += ribbonA * vec3(0.015, 0.23, 0.18) * (0.44 + field);
  color += ribbonB * vec3(0.10, 0.22, 0.035) * 0.45;
  color += contours * vec3(0.08, 0.26, 0.19) * 0.12 * smoothstep(-0.9, 0.45, p.x);
  color += vec3(0.18, 0.58, 0.43) * pow(max(0.0, ribbonA * detail - 0.55), 3.0) * 2.3;
  color *= 1.0 - 0.42 * length(uv - 0.5);
  color *= 0.76 + 0.24 * smoothstep(0.0, 0.42, uv.x);
  color += (hash(gl_FragCoord.xy + uTime) - 0.5) / 255.0;
  glFragColor = vec4(color, 1.0);
}`;

const orbitShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453);
}

float line(float distanceToLine, float width) {
  return 1.0 - smoothstep(width, width * 2.4, abs(distanceToLine));
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = uTime * 0.09;
  vec2 pointer = (uPointer - 0.5) * vec2(0.17 * aspect, 0.12);

  // Place the orbital focus toward the open, right-hand side of the header.
  vec2 center = vec2(aspect * 0.29, 0.015) + pointer;
  vec2 q = p - center;
  q.x += sin(q.y * 3.2 + t) * 0.025;
  float radius = length(q);
  float angle = atan(q.y, q.x);

  vec3 color = vec3(0.010, 0.018, 0.030);
  float atmosphericGlow = exp(-radius * 2.35);
  color += atmosphericGlow * vec3(0.018, 0.105, 0.14);

  // Concentric trajectories are gently distorted so they feel plotted, not perfect.
  float rings = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float orbit = 0.15 + fi * 0.105;
    float wobble = sin(angle * (2.0 + mod(fi, 3.0)) + t * (0.7 + fi * 0.08)) * (0.008 + fi * 0.0015);
    float dash = smoothstep(-0.45, 0.05, sin(angle * (4.0 + fi) - t * (1.2 + fi * 0.17) + fi));
    rings += line(radius - orbit - wobble, 0.0016 + fi * 0.00016) * (0.20 + dash * 0.8);
  }
  color += rings * vec3(0.24, 0.76, 0.66) * 0.34;

  // A diagonal energy horizon adds a strong compositional sweep behind the card.
  float horizonY = q.y + q.x * 0.105 + sin(q.x * 4.5 - t) * 0.018;
  float horizon = exp(-abs(horizonY + 0.025) * 34.0);
  color += horizon * vec3(0.20, 0.80, 0.61) * (0.22 + 0.38 * exp(-radius));

  // Orbiting signal points with small halos.
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float a = fi * 1.73 + t * (0.38 + fi * 0.045);
    float r = 0.19 + fi * 0.092;
    vec2 node = vec2(cos(a), sin(a)) * r;
    node.y *= 0.78 + fi * 0.025;
    float d = length(q - node);
    color += vec3(0.57, 1.0, 0.68) * exp(-d * 260.0) * 1.7;
    color += vec3(0.12, 0.62, 0.52) * exp(-d * 36.0) * 0.13;
  }

  float core = exp(-radius * 11.0);
  color += core * vec3(0.42, 0.95, 0.72) * 0.48;

  // Sparse technical star field, restrained toward the copy side.
  vec2 cells = floor((p + vec2(t * 0.025, 0.0)) * 95.0);
  float star = step(0.992, hash(cells));
  star *= 0.35 + 0.65 * sin(hash(cells + 7.0) * 6.283 + uTime * 0.7) * 0.5 + 0.5;
  color += star * vec3(0.38, 0.60, 0.58) * 0.23;

  float vignette = 1.0 - 0.48 * length((uv - 0.5) * vec2(0.72, 1.0));
  color *= vignette;
  color += (hash(gl_FragCoord.xy + uTime * 0.13) - 0.5) / 255.0;
  glFragColor = vec4(color, 1.0);
}`;

const flowShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.52;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = mat2(0.82, 0.57, -0.57, 0.82) * p * 2.04 + 4.8;
    amplitude *= 0.48;
  }
  return value;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = uTime * 0.07;
  vec2 pointer = (uPointer - 0.5) * vec2(0.14 * aspect, 0.1);

  // Anchor the active flow at the lower center while keeping the copy edge quiet.
  vec2 q = p - vec2(aspect * 0.02, -0.24) + pointer;
  float broad = fbm(q * 0.68 + vec2(t, -t * 0.55));
  float folded = fbm(q * 1.18 + vec2(-t * 0.72, t * 0.4) + broad * 1.65);

  float waveA = q.y + (broad - 0.5) * 0.78 + sin(q.x * 1.8 - t) * 0.08;
  float waveB = q.y - 0.24 + (folded - 0.5) * 0.58 - sin(q.x * 2.2 + t * 0.8) * 0.055;
  float ribbonA = exp(-abs(waveA) * 5.8);
  float ribbonB = exp(-abs(waveB) * 10.0);
  float edgeA = exp(-abs(abs(waveA) - 0.12) * 62.0);
  float edgeB = exp(-abs(abs(waveB) - 0.075) * 82.0);

  vec3 color = vec3(0.965, 0.978, 0.995);
  color = mix(color, vec3(0.42, 0.69, 1.0), ribbonA * 0.52);
  color = mix(color, vec3(0.18, 0.48, 0.98), ribbonB * 0.42);
  color += edgeA * vec3(0.08, 0.40, 1.0) * 0.34;
  color += edgeB * vec3(0.02, 0.28, 0.92) * 0.26;

  // Fine glass contours catch the light only in the denser parts of the flow.
  float contours = 1.0 - smoothstep(0.025, 0.065, abs(fract(folded * 15.0) - 0.5));
  color -= contours * vec3(0.08, 0.23, 0.48) * ribbonA * 0.075;

  float lensDistance = length(q - vec2(0.03, 0.01));
  float lens = exp(-lensDistance * 3.8);
  color += lens * vec3(0.05, 0.24, 0.62) * 0.10;

  // Keep just the far-left edge quiet; the flow now occupies the page center.
  float flowMask = smoothstep(-aspect * 0.48, -aspect * 0.08, p.x);
  color = mix(vec3(0.978, 0.984, 0.992), color, 0.30 + 0.70 * flowMask);
  color += (hash(gl_FragCoord.xy + uTime * 0.1) - 0.5) / 510.0;
  glFragColor = vec4(color, 1.0);
}`;

const navShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = uTime * 0.16;
  float pointerX = (uPointer.x - 0.5) * aspect;

  vec3 color = mix(vec3(0.975, 0.985, 1.0), vec3(0.89, 0.94, 1.0), uv.y * 0.42);

  // A magnetic field bends long contour lines around the pointer.
  float dx = p.x - pointerX;
  float pointerFalloff = exp(-abs(dx) * 0.68);
  float bend = pointerFalloff * sin(dx * 1.18 - t * 1.4) * 0.19;
  bend += sin(p.x * 0.48 + t) * 0.035;

  // Two slow autonomous poles keep the strip alive while the pointer is idle.
  float poleA = sin((p.x + aspect * 0.18) * 0.72 - t) * exp(-abs(p.x + aspect * 0.18) * 0.34) * 0.09;
  float poleB = sin((p.x - aspect * 0.30) * 0.86 + t * 0.74) * exp(-abs(p.x - aspect * 0.30) * 0.42) * 0.07;
  float field = p.y + bend + poleA + poleB;

  float contourDistance = abs(fract(field * 8.5) - 0.5);
  float contours = 1.0 - smoothstep(0.028, 0.072, contourDistance);
  float secondaryDistance = abs(fract((field + p.x * 0.012) * 17.0) - 0.5);
  float secondary = 1.0 - smoothstep(0.015, 0.052, secondaryDistance);
  color = mix(color, vec3(0.18, 0.49, 1.0), contours * 0.34);
  color = mix(color, vec3(0.40, 0.67, 1.0), secondary * 0.09);

  // The active pole has a soft lens and a precise bright core.
  vec2 lensDelta = vec2(dx * 0.18, p.y);
  float lens = exp(-length(lensDelta) * 4.2);
  float core = exp(-length(lensDelta) * 28.0);
  color += lens * vec3(0.06, 0.31, 0.88) * 0.11;
  color += core * vec3(0.18, 0.47, 1.0) * 0.25;

  // Fade linework at the outer edges so the strip has no hard visual seams.
  float edgeFade = smoothstep(0.0, 0.11, uv.y) * smoothstep(0.0, 0.11, 1.0 - uv.y);
  color = mix(vec3(0.965, 0.98, 1.0), color, 0.35 + edgeFade * 0.65);

  float grain = hash(gl_FragCoord.xy + uTime * 0.2) - 0.5;
  color += grain / 510.0;
  glFragColor = vec4(color, 1.0);
}`;

const navPrismShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float facet(vec2 p, vec2 direction, float phase) {
  float coordinate = dot(p, direction) + phase;
  float band = abs(fract(coordinate) - 0.5);
  return 1.0 - smoothstep(0.42, 0.5, band);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = uTime * 0.075;

  vec3 color = mix(vec3(0.018, 0.105, 0.39), vec3(0.035, 0.28, 0.78), uv.x);
  color += vec3(0.015, 0.08, 0.24) * (1.0 - uv.y) * 0.48;

  // Overlapping diagonal planes create wide, glass-like facets.
  float planeA = facet(p * 0.24, normalize(vec2(0.86, 0.50)), t);
  float planeB = facet(p * 0.19, normalize(vec2(-0.72, 0.69)), -t * 0.74 + 0.3);
  float planeC = facet(p * 0.31, normalize(vec2(0.96, -0.28)), t * 0.48 + 0.67);
  color += planeA * vec3(0.03, 0.18, 0.42) * 0.22;
  color += planeB * vec3(0.10, 0.28, 0.62) * 0.18;
  color -= planeC * vec3(0.01, 0.05, 0.16) * 0.14;

  // Hairline seams make the large planes read as cut glass.
  float seamA = 1.0 - smoothstep(0.008, 0.024, abs(fract(dot(p, vec2(0.19, 0.34)) + t) - 0.5));
  float seamB = 1.0 - smoothstep(0.008, 0.026, abs(fract(dot(p, vec2(-0.14, 0.42)) - t * 0.63) - 0.5));
  color += (seamA + seamB) * vec3(0.30, 0.66, 1.0) * 0.19;

  // A broad refracted highlight follows the pointer without becoming a spotlight.
  float pointerX = (uPointer.x - 0.5) * aspect;
  float sweep = exp(-abs(p.x - pointerX) * 0.48);
  float refraction = sin((p.x - pointerX) * 1.7 + p.y * 4.0 - t * 2.0) * 0.5 + 0.5;
  color += sweep * refraction * vec3(0.10, 0.38, 0.92) * 0.27;

  float topLight = exp(-abs(uv.y - 0.92) * 22.0);
  color += topLight * vec3(0.20, 0.52, 1.0) * 0.18;

  color += (hash(gl_FragCoord.xy + uTime * 0.1) - 0.5) / 330.0;
  glFragColor = vec4(color, 1.0);
}`;

const flowPrismShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;
uniform float uNavHeight;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.52;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p = mat2(0.82, 0.57, -0.57, 0.82) * p * 2.04 + 4.8;
    amplitude *= 0.48;
  }
  return value;
}

float facet(vec2 p, vec2 direction, float phase) {
  float coordinate = dot(p, direction) + phase;
  float band = abs(fract(coordinate) - 0.5);
  return 1.0 - smoothstep(0.42, 0.5, band);
}

vec3 renderFlow(vec2 uv) {
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = uTime * 0.07;
  vec2 pointer = (uPointer - 0.5) * vec2(0.14 * aspect, 0.1);
  vec2 q = p - vec2(aspect * 0.02, -0.24) + pointer;
  float broad = fbm(q * 0.68 + vec2(t, -t * 0.55));
  float folded = fbm(q * 1.18 + vec2(-t * 0.72, t * 0.4) + broad * 1.65);
  float waveA = q.y + (broad - 0.5) * 0.78 + sin(q.x * 1.8 - t) * 0.08;
  float waveB = q.y - 0.24 + (folded - 0.5) * 0.58 - sin(q.x * 2.2 + t * 0.8) * 0.055;
  float ribbonA = exp(-abs(waveA) * 5.8);
  float ribbonB = exp(-abs(waveB) * 10.0);
  float edgeA = exp(-abs(abs(waveA) - 0.12) * 62.0);
  float edgeB = exp(-abs(abs(waveB) - 0.075) * 82.0);
  vec3 color = vec3(0.965, 0.978, 0.995);
  color = mix(color, vec3(0.42, 0.69, 1.0), ribbonA * 0.52);
  color = mix(color, vec3(0.18, 0.48, 0.98), ribbonB * 0.42);
  color += edgeA * vec3(0.08, 0.40, 1.0) * 0.34;
  color += edgeB * vec3(0.02, 0.28, 0.92) * 0.26;
  float contours = 1.0 - smoothstep(0.025, 0.065, abs(fract(folded * 15.0) - 0.5));
  color -= contours * vec3(0.08, 0.23, 0.48) * ribbonA * 0.075;
  float lens = exp(-length(q - vec2(0.03, 0.01)) * 3.8);
  color += lens * vec3(0.05, 0.24, 0.62) * 0.10;
  float flowMask = smoothstep(-aspect * 0.48, -aspect * 0.08, p.x);
  return mix(vec3(0.978, 0.984, 0.992), color, 0.30 + 0.70 * flowMask);
}

vec3 renderPrism(vec2 uv) {
  float navHeight = min(uNavHeight, uResolution.y);
  float aspect = uResolution.x / navHeight;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = uTime * 0.075;
  vec3 color = mix(vec3(0.018, 0.105, 0.39), vec3(0.035, 0.28, 0.78), uv.x);
  color += vec3(0.015, 0.08, 0.24) * (1.0 - uv.y) * 0.48;
  float planeA = facet(p * 0.24, normalize(vec2(0.86, 0.50)), t);
  float planeB = facet(p * 0.19, normalize(vec2(-0.72, 0.69)), -t * 0.74 + 0.3);
  float planeC = facet(p * 0.31, normalize(vec2(0.96, -0.28)), t * 0.48 + 0.67);
  color += planeA * vec3(0.03, 0.18, 0.42) * 0.22;
  color += planeB * vec3(0.10, 0.28, 0.62) * 0.18;
  color -= planeC * vec3(0.01, 0.05, 0.16) * 0.14;
  float seamA = 1.0 - smoothstep(0.008, 0.024, abs(fract(dot(p, vec2(0.19, 0.34)) + t) - 0.5));
  float seamB = 1.0 - smoothstep(0.008, 0.026, abs(fract(dot(p, vec2(-0.14, 0.42)) - t * 0.63) - 0.5));
  color += (seamA + seamB) * vec3(0.30, 0.66, 1.0) * 0.19;
  float pointerX = (uPointer.x - 0.5) * aspect;
  float sweep = exp(-abs(p.x - pointerX) * 0.48);
  float refraction = sin((p.x - pointerX) * 1.7 + p.y * 4.0 - t * 2.0) * 0.5 + 0.5;
  color += sweep * refraction * vec3(0.10, 0.38, 0.92) * 0.27;
  color += exp(-abs(uv.y - 0.92) * 22.0) * vec3(0.20, 0.52, 1.0) * 0.18;
  return color;
}

void main() {
  float navHeight = min(uNavHeight, uResolution.y);
  float navStart = uResolution.y - navHeight;
  vec3 color;
  if (gl_FragCoord.y >= navStart) {
    vec2 navUv = vec2(vUv.x, (gl_FragCoord.y - navStart) / navHeight);
    color = renderPrism(navUv);
  } else {
    color = renderFlow(vUv);
  }
  color += (hash(gl_FragCoord.xy + uTime * 0.1) - 0.5) / 420.0;
  glFragColor = vec4(color, 1.0);
}`;

const shader =
  app.dataset.effect === "orbit"
    ? orbitShader
    : app.dataset.effect === "flow"
      ? flowShader
      : app.dataset.effect === "nav"
        ? navShader
        : app.dataset.effect === "nav-prism"
          ? navPrismShader
          : app.dataset.effect === "flow-prism"
            ? flowPrismShader
            : auroraShader;

const engine = createGLEngine(canvas, { alpha: false, antialias: false });
setHardwareScalingLevel(engine, 1 / Math.min(devicePixelRatio || 1, 1.5));
const effect = createEffectWrapper(engine, {
  name:
    app.dataset.effect === "orbit"
      ? "header-orbit"
      : app.dataset.effect === "flow"
        ? "header-flow"
        : app.dataset.effect === "nav"
          ? "header-nav"
          : app.dataset.effect === "nav-prism"
            ? "header-nav-prism"
            : app.dataset.effect === "flow-prism"
              ? "header-flow-prism"
              : "header-aurora",
  fragmentSource: shader,
  uniformNames:
    app.dataset.effect === "flow-prism"
      ? ["uResolution", "uPointer", "uTime", "uNavHeight"]
      : ["uResolution", "uPointer", "uTime"],
  samplerNames: [],
});

let pointerX = 0.68;
let pointerY = 0.48;
let targetX = pointerX;
let targetY = pointerY;
let time = 0;
let previousTime = performance.now();
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

window.addEventListener(
  "pointermove",
  (event) => {
    targetX = event.clientX / innerWidth;
    targetY = 1 - event.clientY / innerHeight;
  },
  { passive: true },
);

runRenderLoop(engine, () => {
  const now = performance.now();
  const delta = Math.min((now - previousTime) / 1000, 0.05);
  previousTime = now;
  if (!reducedMotion) time += delta;
  pointerX += (targetX - pointerX) * 0.035;
  pointerY += (targetY - pointerY) * 0.035;
  resizeGLEngine(engine);
  if (!isEffectReady(engine, effect.effect)) return;
  setViewport(engine);
  applyEffectWrapper(effect);
  setEffectFloat2(engine, effect.effect, "uResolution", canvas.width, canvas.height);
  setEffectFloat2(engine, effect.effect, "uPointer", pointerX, pointerY);
  setEffectFloat(engine, effect.effect, "uTime", time);
  if (app.dataset.effect === "flow-prism") {
    const canvasScale = canvas.height / Math.max(canvas.clientHeight, 1);
    setEffectFloat(engine, effect.effect, "uNavHeight", siteHeader.clientHeight * canvasScale);
  }
  drawEffect(engine);
});
