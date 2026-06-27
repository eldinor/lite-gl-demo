import {
  applyEffectWrapper,
  createEffectWrapper,
  createGLEngine,
  createRawTexture,
  createSpriteRenderer,
  drawEffect,
  GLBlendMode,
  isEffectReady,
  renderSprites,
  resizeGLEngine,
  runRenderLoop,
  setEffectFloat,
  setHardwareScalingLevel,
  setViewport,
  type GLSprite,
} from "@babylonjs/lite-gl";
import "./particles.css";
import "./typography.css";
import { BRAND_HTML, PACKAGE_LINK_HTML } from "./brand";

const PARTICLE_COUNT = 1400;
const TEXTURE_SIZE = 64;
const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

type Particle = {
  sprite: GLSprite;
  vx: number;
  vy: number;
  seed: number;
};

const app = document.querySelector<HTMLDivElement>("#particlesApp");
if (!app) throw new Error("Missing #particlesApp");

app.innerHTML = `
  <div class="particle-shell">
    <header>
      ${BRAND_HTML}
      <span class="badge"><i></i> WebGL2</span>
      <nav>
        <a href="/shaders.html">Shaders</a><a href="/feedback.html">Feedback</a><a href="/particles.html" aria-current="page">Particles</a><a href="/geometry.html">Geometry</a><a href="/texture.html">Texture</a>
      </nav>
      ${PACKAGE_LINK_HTML}
    </header>

    <main>
      <canvas id="particleCanvas"></canvas>
      <section class="title-block">
        <span class="eyebrow">Demo 03 · Sprite renderer</span>
        <h1>Particle<br />Field</h1>
        <p>1,400 procedural sprites. One texture, one dynamic buffer upload, one batched draw.</p>
      </section>

      <aside class="particle-controls">
        <div class="metric"><span>Sprites</span><b>${PARTICLE_COUNT.toLocaleString()}</b></div>
        <div class="metric"><span>Draw calls</span><b>02</b></div>
        <label>
          <span>Motion</span>
          <select id="motionSelect">
            <option value="vortex">Vortex</option>
            <option value="attract">Attract</option>
            <option value="repel">Repel</option>
          </select>
        </label>
        <label>
          <span>Force</span>
          <input id="forceControl" type="range" min="0.15" max="2.5" value="1.1" step="0.05" />
          <output id="forceOutput">1.10</output>
        </label>
        <button id="resetParticles">Reset field</button>
      </aside>

      <div class="pointer-note"><i></i><span>Move your pointer to shape the field</span></div>
      <div class="api-strip"><span>createRawTexture</span><span>createSpriteRenderer</span><span>renderSprites</span><span>GLBlendMode.ADD</span></div>
    </main>
  </div>
`;

const BACKGROUND_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform float uTime;
void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float haze = exp(-2.4 * dot(p, p));
    vec3 top = vec3(0.006, 0.012, 0.032);
    vec3 bottom = vec3(0.018, 0.006, 0.028);
    vec3 color = mix(bottom, top, vUv.y);
    color += haze * (0.014 + 0.006 * sin(uTime * 0.3)) * vec3(0.2, 0.45, 1.0);
    glFragColor = vec4(color, 1.0);
}`;

function makeGlowTexture(): Uint8Array {
  const pixels = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const nx = (x + 0.5) / TEXTURE_SIZE * 2 - 1;
      const ny = (y + 0.5) / TEXTURE_SIZE * 2 - 1;
      const radius = Math.sqrt(nx * nx + ny * ny);
      const glow = Math.max(0, Math.min(1, Math.exp(-radius * radius * 5.5) - 0.005));
      const core = Math.max(0, 1 - radius * 5);
      const index = (y * TEXTURE_SIZE + x) * 4;
      pixels[index] = 255;
      pixels[index + 1] = 255;
      pixels[index + 2] = 255;
      pixels[index + 3] = Math.round(Math.min(1, glow + core * 0.7) * 255);
    }
  }
  return pixels;
}

function random(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

const canvas = document.querySelector<HTMLCanvasElement>("#particleCanvas")!;
const motionSelect = document.querySelector<HTMLSelectElement>("#motionSelect")!;
const forceControl = document.querySelector<HTMLInputElement>("#forceControl")!;
const forceOutput = document.querySelector<HTMLOutputElement>("#forceOutput")!;
const engine = createGLEngine(canvas, { alpha: false, antialias: false });
setHardwareScalingLevel(engine, 1 / Math.min(devicePixelRatio || 1, 1.5));

const texture = createRawTexture(engine, makeGlowTexture(), TEXTURE_SIZE, TEXTURE_SIZE, engine.gl.RGBA, engine.gl.UNSIGNED_BYTE, {
  minFilter: engine.gl.LINEAR,
  magFilter: engine.gl.LINEAR,
});
const renderer = createSpriteRenderer(engine, {
  capacity: PARTICLE_COUNT,
  cellWidth: TEXTURE_SIZE,
  cellHeight: TEXTURE_SIZE,
  texture,
  blendMode: GLBlendMode.ADD,
});
const background = createEffectWrapper(engine, {
  name: "particle-background",
  fragmentSource: BACKGROUND_SHADER,
  uniformNames: ["uTime"],
});

const particles: Particle[] = [];
const sprites: GLSprite[] = [];
let aspect = 1;

function resetField(): void {
  particles.length = 0;
  sprites.length = 0;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const seed = random(i + 1);
    const angle = random(i * 3.17 + 4) * Math.PI * 2;
    const radius = Math.sqrt(random(i * 5.23 + 9)) * 0.92;
    const sprite: GLSprite = {
      position: { x: Math.cos(angle) * radius * aspect, y: Math.sin(angle) * radius, z: 0 },
      width: 0.026 + seed * 0.035,
      height: 0.026 + seed * 0.035,
      angle: 0,
      color: { r: 0.3, g: 0.65, b: 1, a: 0.3 + seed * 0.65 },
    };
    particles.push({ sprite, vx: -Math.sin(angle) * 0.03, vy: Math.cos(angle) * 0.03, seed });
    sprites.push(sprite);
  }
}

let time = 0;
let previousTime = performance.now();
let pointerX = 0;
let pointerY = 0;
let pointerActive = false;
const projection = new Float32Array(IDENTITY);

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointerX = ((event.clientX - rect.left) / rect.width * 2 - 1) * aspect;
  pointerY = (1 - (event.clientY - rect.top) / rect.height * 2);
  pointerActive = true;
});
canvas.addEventListener("pointerleave", () => { pointerActive = false; });
forceControl.addEventListener("input", () => { forceOutput.value = Number(forceControl.value).toFixed(2); });
document.querySelector<HTMLButtonElement>("#resetParticles")!.addEventListener("click", resetField);

resetField();

runRenderLoop(engine, () => {
  const now = performance.now();
  const delta = Math.min((now - previousTime) / 1000, 0.033);
  previousTime = now;
  time += delta;

  resizeGLEngine(engine);
  const nextAspect = canvas.width / Math.max(canvas.height, 1);
  if (Math.abs(nextAspect - aspect) > 0.001) {
    const ratio = nextAspect / aspect;
    for (const particle of particles) particle.sprite.position.x *= ratio;
    aspect = nextAspect;
  }
  projection[0] = 1 / aspect;
  setViewport(engine);

  if (isEffectReady(engine, background.effect)) {
    applyEffectWrapper(background);
    setEffectFloat(engine, background.effect, "uTime", time);
    drawEffect(engine);
  }

  const targetX = pointerActive ? pointerX : Math.cos(time * 0.63) * aspect * 0.38;
  const targetY = pointerActive ? pointerY : Math.sin(time * 0.81) * 0.38;
  const force = Number(forceControl.value);
  const mode = motionSelect.value;

  for (const particle of particles) {
    const position = particle.sprite.position;
    const dx = targetX - position.x;
    const dy = targetY - position.y;
    const distanceSquared = dx * dx + dy * dy + 0.012;
    const inverseDistance = 1 / Math.sqrt(distanceSquared);
    let ax = dx * inverseDistance;
    let ay = dy * inverseDistance;

    if (mode === "repel") {
      ax *= -1.35 / distanceSquared;
      ay *= -1.35 / distanceSquared;
    } else if (mode === "vortex") {
      const radialX = ax;
      ax = -ay * 1.3 + radialX * 0.24;
      ay = radialX * 1.3 + ay * 0.24;
    }

    const acceleration = Math.min(2.2, 0.12 / distanceSquared) * force;
    particle.vx = (particle.vx + ax * acceleration * delta) * 0.982;
    particle.vy = (particle.vy + ay * acceleration * delta) * 0.982;
    const maxSpeed = 0.9 + particle.seed * 0.5;
    const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
    if (speed > maxSpeed) {
      particle.vx *= maxSpeed / speed;
      particle.vy *= maxSpeed / speed;
    }
    position.x += particle.vx * delta;
    position.y += particle.vy * delta;

    if (position.x < -aspect * 1.08) position.x = aspect * 1.08;
    if (position.x > aspect * 1.08) position.x = -aspect * 1.08;
    if (position.y < -1.08) position.y = 1.08;
    if (position.y > 1.08) position.y = -1.08;

    const color = particle.sprite.color!;
    const energy = Math.min(1, speed * 1.4);
    color.r = 0.18 + energy * 0.72;
    color.g = 0.42 + particle.seed * 0.45;
    color.b = 1.0;
    color.a = 0.24 + particle.seed * 0.55;
    particle.sprite.angle += delta * (0.2 + particle.seed);
  }

  renderSprites(renderer, sprites, delta * 1000, IDENTITY, projection);
});
