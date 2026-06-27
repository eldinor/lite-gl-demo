import {
  applyEffectWrapper,
  bindRenderTarget,
  clearEngine,
  createEffect,
  createEffectWrapper,
  createFloatRenderTarget,
  createIndexBuffer,
  createMeshVao,
  createVertexBuffer,
  drawEffect,
  drawMesh,
  isEffectReady,
  resizeGLEngine,
  resizeRenderTarget,
  runRenderLoop,
  setCullState,
  setDepthState,
  setEffectFloat,
  setEffectFloat2,
  setEffectMatrix,
  setEffectTexture,
  setHardwareScalingLevel,
  setViewport,
  useEffect,
  createGLEngine,
  type GLMeshVao,
} from "@babylonjs/lite-gl";
import "./geometry.css";
import "./typography.css";
import { BRAND_HTML, PACKAGE_LINK_HTML } from "./brand";

const COLS = 28;
const ROWS = 18;
const INSTANCE_COUNT = COLS * ROWS;

const app = document.querySelector<HTMLDivElement>("#geometryApp");
if (!app) throw new Error("Missing #geometryApp");

app.innerHTML = `
  <div class="geometry-shell">
    <header>
      ${BRAND_HTML}
      <span class="badge"><i></i> WebGL2</span>
      <nav>
        <a href="/shaders.html">Shaders</a><a href="/feedback.html">Feedback</a><a href="/particles.html">Particles</a><a href="/geometry.html" aria-current="page">Geometry</a><a href="/texture.html">Texture</a>
      </nav>
      ${PACKAGE_LINK_HTML}
    </header>
    <main>
      <canvas id="geometryCanvas"></canvas>
      <section class="hero-copy">
        <span class="eyebrow">Demo 04 · Instanced HDR geometry</span>
        <h1>Crystal<br />Matrix</h1>
        <p>One indexed crystal mesh, instanced 504 times into a depth-tested field and tone-mapped from an HDR render target.</p>
      </section>
      <aside class="geometry-controls">
        <div class="stats"><div><span>Instances</span><b>${INSTANCE_COUNT}</b></div><div><span>Triangles</span><b>${(INSTANCE_COUNT * 8).toLocaleString()}</b></div></div>
        <label><span>Exposure</span><input id="exposureControl" type="range" min="0.35" max="2.2" value="1.1" step="0.05" /><output id="exposureOutput">1.10</output></label>
        <label><span>Bloom</span><input id="bloomControl" type="range" min="0" max="2.5" value="1.15" step="0.05" /><output id="bloomOutput">1.15</output></label>
        <button id="cameraButton">Follow pointer</button>
      </aside>
      <div class="render-path"><span>Instanced VAO</span><i>→</i><span>RGBA16F + depth</span><i>→</i><span>Bloom + tone map</span></div>
      <div class="api-list"><span>createMeshVao</span><span>drawMesh</span><span>createFloatRenderTarget</span><span>setDepthState</span></div>
    </main>
  </div>
`;

const VERTEX_SHADER = `#version 300 es
precision highp float;
in vec3 aPosition;
in vec3 aNormal;
in vec3 aOffset;
in vec3 aColor;
in vec2 aParams;
uniform mat4 uView;
uniform mat4 uProjection;
uniform float uTime;
out vec3 vColor;
out vec3 vNormal;
out vec3 vWorld;

mat2 rotate2d(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

void main() {
    float scale = aParams.x;
    float phase = aParams.y;
    vec3 local = aPosition * scale;
    local.xz = rotate2d(uTime * 0.35 + phase) * local.xz;
    local.yz = rotate2d(sin(uTime * 0.27 + phase) * 0.55) * local.yz;
    vec3 normal = aNormal;
    normal.xz = rotate2d(uTime * 0.35 + phase) * normal.xz;
    normal.yz = rotate2d(sin(uTime * 0.27 + phase) * 0.55) * normal.yz;
    float wave = sin(length(aOffset.xz) * 0.72 - uTime * 1.45 + phase) * 0.72;
    vec3 world = local + aOffset + vec3(0.0, wave, 0.0);
    vColor = aColor;
    vNormal = normalize(normal);
    vWorld = world;
    gl_Position = uProjection * uView * vec4(world, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec3 vColor;
in vec3 vNormal;
in vec3 vWorld;
out vec4 glFragColor;
uniform float uTime;
void main() {
    vec3 lightA = normalize(vec3(0.4, 1.0, 0.35));
    vec3 lightB = normalize(vec3(-0.7, 0.25, -0.4));
    float diffuse = max(dot(vNormal, lightA), 0.0);
    float rim = pow(1.0 - abs(dot(vNormal, normalize(vec3(0.0, 0.4, 1.0)))), 3.0);
    float back = max(dot(vNormal, lightB), 0.0);
    vec3 color = vColor * (0.12 + diffuse * 1.35);
    color += vColor.zxy * back * 0.7;
    color += rim * (1.6 + 0.6 * sin(uTime + vWorld.x)) * vec3(0.35, 0.8, 1.8);
    glFragColor = vec4(color, 1.0);
}`;

const COMPOSITE_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform sampler2D uHdr;
uniform vec2 uTexel;
uniform float uExposure;
uniform float uBloom;
vec3 bright(vec3 c) { return c * smoothstep(0.72, 1.8, max(c.r, max(c.g, c.b))); }
void main() {
    vec3 hdr = texture(uHdr, vUv).rgb;
    vec3 bloom = vec3(0.0);
    bloom += bright(texture(uHdr, vUv + uTexel * vec2(5.0, 0.0)).rgb);
    bloom += bright(texture(uHdr, vUv - uTexel * vec2(5.0, 0.0)).rgb);
    bloom += bright(texture(uHdr, vUv + uTexel * vec2(0.0, 5.0)).rgb);
    bloom += bright(texture(uHdr, vUv - uTexel * vec2(0.0, 5.0)).rgb);
    bloom += bright(texture(uHdr, vUv + uTexel * vec2(3.0, 3.0)).rgb);
    bloom += bright(texture(uHdr, vUv - uTexel * vec2(3.0, 3.0)).rgb);
    hdr += bloom * 0.12 * uBloom;
    vec3 mapped = 1.0 - exp(-hdr * uExposure);
    mapped = pow(mapped, vec3(1.0 / 2.2));
    vec2 p = vUv * 2.0 - 1.0;
    mapped *= 1.0 - 0.22 * dot(p, p);
    glFragColor = vec4(mapped, 1.0);
}`;

function buildCrystal(): { vertices: Float32Array; indices: Uint16Array } {
  const top: [number, number, number] = [0, 1, 0];
  const bottom: [number, number, number] = [0, -1, 0];
  const ring: [number, number, number][] = [[1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1]];
  const faces: [number[], number[], number[]][] = [];
  for (let i = 0; i < 4; i++) {
    const next = ring[(i + 1) % 4]!;
    faces.push([top, ring[i]!, next], [bottom, next, ring[i]!]);
  }
  const values: number[] = [];
  const indices: number[] = [];
  for (const face of faces) {
    let [a, b, c] = face;
    const ab = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
    const ac = [c[0]! - a[0]!, c[1]! - a[1]!, c[2]! - a[2]!];
    let normal = [ab[1]! * ac[2]! - ab[2]! * ac[1]!, ab[2]! * ac[0]! - ab[0]! * ac[2]!, ab[0]! * ac[1]! - ab[1]! * ac[0]!];
    const center = [(a[0]! + b[0]! + c[0]!) / 3, (a[1]! + b[1]! + c[1]!) / 3, (a[2]! + b[2]! + c[2]!) / 3];
    if (normal[0]! * center[0]! + normal[1]! * center[1]! + normal[2]! * center[2]! < 0) {
      [b, c] = [c, b];
      normal = normal.map((value) => -value);
    }
    const length = Math.hypot(normal[0]!, normal[1]!, normal[2]!);
    normal = normal.map((value) => value / length);
    for (const point of [a, b, c]) {
      values.push(point[0]!, point[1]!, point[2]!, normal[0]!, normal[1]!, normal[2]!);
      indices.push(indices.length);
    }
  }
  return { vertices: new Float32Array(values), indices: new Uint16Array(indices) };
}

function random(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function perspective(out: Float32Array, fov: number, aspect: number, near: number, far: number): void {
  const f = 1 / Math.tan(fov / 2);
  out.fill(0); out[0] = f / aspect; out[5] = f; out[10] = (far + near) / (near - far); out[11] = -1; out[14] = 2 * far * near / (near - far);
}

function lookAt(out: Float32Array, eye: number[], center: number[]): void {
  let zx = eye[0]! - center[0]!, zy = eye[1]! - center[1]!, zz = eye[2]! - center[2]!;
  let length = Math.hypot(zx, zy, zz); zx /= length; zy /= length; zz /= length;
  let xx = zz, xy = 0, xz = -zx; length = Math.hypot(xx, xz); xx /= length; xz /= length;
  const yx = zy * xz, yy = zz * xx - zx * xz, yz = -zy * xx;
  out.set([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0, -(xx * eye[0]! + xy * eye[1]! + xz * eye[2]!), -(yx * eye[0]! + yy * eye[1]! + yz * eye[2]!), -(zx * eye[0]! + zy * eye[1]! + zz * eye[2]!), 1]);
}

const canvas = document.querySelector<HTMLCanvasElement>("#geometryCanvas")!;
const exposureControl = document.querySelector<HTMLInputElement>("#exposureControl")!;
const bloomControl = document.querySelector<HTMLInputElement>("#bloomControl")!;
const exposureOutput = document.querySelector<HTMLOutputElement>("#exposureOutput")!;
const bloomOutput = document.querySelector<HTMLOutputElement>("#bloomOutput")!;
const engine = createGLEngine(canvas, { alpha: false, antialias: true, depth: true });
setHardwareScalingLevel(engine, 1 / Math.min(devicePixelRatio || 1, 1.5));

const crystal = buildCrystal();
const vertexBuffer = createVertexBuffer(engine, crystal.vertices);
const indexBuffer = createIndexBuffer(engine, crystal.indices);
const instanceValues = new Float32Array(INSTANCE_COUNT * 8);
for (let z = 0; z < ROWS; z++) {
  for (let x = 0; x < COLS; x++) {
    const index = z * COLS + x;
    const offset = index * 8;
    const seed = random(index + 2);
    instanceValues[offset] = (x - (COLS - 1) / 2) * 0.48;
    instanceValues[offset + 1] = -0.65 + seed * 0.1;
    instanceValues[offset + 2] = (z - (ROWS - 1) / 2) * 0.5;
    instanceValues[offset + 3] = 0.12 + seed * 0.3;
    instanceValues[offset + 4] = 0.35 + random(index * 2 + 4) * 0.55;
    instanceValues[offset + 5] = 0.72 + random(index * 3 + 7) * 0.28;
    instanceValues[offset + 6] = 0.12 + seed * 0.2;
    instanceValues[offset + 7] = seed * 6.28318;
  }
}
const instanceBuffer = createVertexBuffer(engine, instanceValues);
const meshEffect = createEffect(engine, {
  name: "crystal-mesh",
  vertexSource: VERTEX_SHADER,
  fragmentSource: FRAGMENT_SHADER,
  attributeNames: ["aPosition", "aNormal", "aOffset", "aColor", "aParams"],
  uniformNames: ["uView", "uProjection", "uTime"],
  samplerNames: [],
});
const composite = createEffectWrapper(engine, { name: "hdr-composite", fragmentSource: COMPOSITE_SHADER, uniformNames: ["uTexel", "uExposure", "uBloom"], samplerNames: ["uHdr"] });
const target = createFloatRenderTarget(engine, { width: 2, height: 2, generateDepthBuffer: true });
let vao: GLMeshVao | null = null;
let targetWidth = 2;
let targetHeight = 2;
const view = new Float32Array(16);
const projection = new Float32Array(16);
let time = 0;
let previousTime = performance.now();
let pointerX = 0;
let pointerY = 0;
let followPointer = true;

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointerX = (event.clientX - rect.left) / rect.width * 2 - 1;
  pointerY = (event.clientY - rect.top) / rect.height * 2 - 1;
});
exposureControl.addEventListener("input", () => { exposureOutput.value = Number(exposureControl.value).toFixed(2); });
bloomControl.addEventListener("input", () => { bloomOutput.value = Number(bloomControl.value).toFixed(2); });
document.querySelector<HTMLButtonElement>("#cameraButton")!.addEventListener("click", (event) => {
  followPointer = !followPointer;
  (event.currentTarget as HTMLButtonElement).textContent = followPointer ? "Follow pointer" : "Auto orbit";
});

runRenderLoop(engine, () => {
  const now = performance.now();
  const delta = Math.min((now - previousTime) / 1000, 0.05);
  previousTime = now;
  time += delta;
  resizeGLEngine(engine);

  const scale = Math.min(1, 1280 / Math.max(canvas.width, canvas.height));
  const width = Math.max(2, Math.round(canvas.width * scale));
  const height = Math.max(2, Math.round(canvas.height * scale));
  if (width !== targetWidth || height !== targetHeight) {
    targetWidth = width; targetHeight = height; resizeRenderTarget(engine, target, width, height);
  }
  if (!isEffectReady(engine, meshEffect) || !isEffectReady(engine, composite.effect)) return;
  if (!vao) {
    vao = createMeshVao(engine, [
      { buffer: vertexBuffer, attributes: [{ name: "aPosition", size: 3, offset: 0, divisor: 0 }, { name: "aNormal", size: 3, offset: 12, divisor: 0 }], computeStride: true },
      { buffer: instanceBuffer, attributes: [{ name: "aOffset", size: 3, offset: 0 }, { name: "aColor", size: 3, offset: 12 }, { name: "aParams", size: 2, offset: 24 }], computeStride: true },
    ], indexBuffer, meshEffect);
  }

  const yaw = followPointer ? pointerX * 0.9 : Math.sin(time * 0.16) * 0.85;
  const pitch = followPointer ? pointerY * 0.8 : Math.sin(time * 0.21) * 0.35;
  const eye = [Math.sin(yaw) * 9.5, 4.4 + pitch * 2.2, Math.cos(yaw) * 9.5];
  lookAt(view, eye, [0, -0.4, 0]);
  perspective(projection, Math.PI / 3.25, width / height, 0.1, 40);

  bindRenderTarget(engine, target);
  setDepthState(engine, { test: true, write: true, func: engine.gl.LESS });
  setCullState(engine, true, engine.gl.BACK);
  clearEngine(engine, { color: { r: 0.002, g: 0.004, b: 0.012, a: 1 }, depth: true });
  useEffect(engine, meshEffect);
  setEffectMatrix(engine, meshEffect, "uView", view);
  setEffectMatrix(engine, meshEffect, "uProjection", projection);
  setEffectFloat(engine, meshEffect, "uTime", time);
  drawMesh(engine, vao, INSTANCE_COUNT);

  bindRenderTarget(engine, null);
  setDepthState(engine, { test: false, write: false });
  setCullState(engine, false);
  setViewport(engine);
  applyEffectWrapper(composite);
  setEffectTexture(engine, composite.effect, "uHdr", target.texture);
  setEffectFloat2(engine, composite.effect, "uTexel", 1 / width, 1 / height);
  setEffectFloat(engine, composite.effect, "uExposure", Number(exposureControl.value));
  setEffectFloat(engine, composite.effect, "uBloom", Number(bloomControl.value));
  drawEffect(engine);
});
