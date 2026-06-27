import {
  applyEffectWrapper,
  createEffectWrapper,
  createGLEngine,
  disposeEffectWrapper,
  drawEffect,
  isEffectReady,
  resizeGLEngine,
  runRenderLoop,
  setEffectFloat,
  setEffectFloat3,
  setEffectFloat4,
  setEffectInt,
  setHardwareScalingLevel,
  setViewport,
  type GLEffectWrapper,
} from "@babylonjs/lite-gl";
import "./style.css";
import "./typography.css";
import { BRAND_HTML, PACKAGE_LINK_HTML } from "./brand";

const exampleCatalog = [
  {
    name: "Electric bloom",
    source: `// Electric bloom — folded space and a cosine palette.
vec3 palette(float t) {
    vec3 a = vec3(0.50);
    vec3 b = vec3(0.50);
    vec3 c = vec3(1.00);
    vec3 d = vec3(0.00, 0.18, 0.42);
    return a + b * cos(6.28318 * (c * t + d));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    vec2 uv0 = uv;
    vec3 color = vec3(0.0);

    for (float i = 0.0; i < 4.0; i++) {
        uv = fract(uv * 1.55) - 0.5;
        float d = length(uv) * exp(-length(uv0));
        vec3 tint = palette(length(uv0) + i * 0.38 + iTime * 0.12);
        d = sin(d * 8.0 + iTime) / 8.0;
        d = abs(d);
        d = pow(0.012 / max(d, 0.001), 1.15);
        color += tint * d;
    }

    fragColor = vec4(color, 1.0);
}`,
  },
  {
    name: "Liquid chrome",
    source: `// Liquid chrome — cool polished metal with sharp reflections.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    float t = iTime * 0.35;
    vec2 p = uv;
    float field = 0.0;

    for (float i = 1.0; i < 7.0; i++) {
        p += vec2(cos(p.y * i + t), sin(p.x * i - t)) / i;
        field += sin(p.x * i + p.y * 1.7 + t) / i;
    }

    float bands = sin(field * 5.5 + length(uv) * 9.0 - t * 3.0);
    float metal = 0.5 + 0.5 * cos(bands * 2.8 + field * 1.3);
    vec3 darkSteel = vec3(0.018, 0.025, 0.035);
    vec3 brightSteel = vec3(0.68, 0.78, 0.88);
    vec3 chrome = mix(darkSteel, brightSteel, smoothstep(0.08, 0.92, metal));
    float shine = pow(max(0.0, 1.0 - abs(bands)), 18.0);
    chrome += shine * vec3(0.82, 0.96, 1.0) * 1.7;
    chrome += 0.055 * cos(field * 4.0 + vec3(1.2, 2.8, 4.8));
    chrome *= 1.0 - 0.2 * dot(uv, uv);

    fragColor = vec4(chrome, 1.0);
}`,
  },
  {
    name: "Solar iris",
    source: `// Solar iris — polar rays around a molten core.
float hash(float n) {
    return fract(sin(n) * 43758.5453);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    float radius = length(uv);
    float angle = atan(uv.y, uv.x);
    float t = iTime * 0.45;

    float rays = 0.5 + 0.5 * sin(angle * 18.0 + sin(angle * 7.0 - t) * 2.0);
    rays *= 0.5 + 0.5 * sin(angle * 31.0 + t * 1.7);
    float corona = rays * exp(-3.8 * radius) / max(radius, 0.035);
    float ring = 0.018 / max(abs(radius - 0.31 - sin(angle * 8.0 + t) * 0.015), 0.004);
    float core = smoothstep(0.31, 0.03, radius);

    vec3 color = vec3(0.008, 0.003, 0.018);
    color += corona * vec3(1.0, 0.12, 0.02) * 0.15;
    color += ring * vec3(1.0, 0.42, 0.06) * 0.12;
    color += core * mix(vec3(1.0, 0.08, 0.01), vec3(1.0, 0.9, 0.55), 1.0 - radius / 0.31);
    color = 1.0 - exp(-color);

    fragColor = vec4(color, 1.0);
}`,
  },
  {
    name: "Prism tunnel",
    source: `// Prism tunnel — an endless geometric corridor.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    float t = iTime * 0.55;
    float angle = atan(uv.y, uv.x);
    float radius = max(length(uv), 0.001);
    vec2 tunnel = vec2(angle / 6.28318, 0.22 / radius + t);

    vec2 grid = abs(fract(tunnel * vec2(8.0, 5.0)) - 0.5);
    float lines = min(grid.x, grid.y);
    float beam = 0.025 / max(lines, 0.006);
    float pulse = 0.55 + 0.45 * sin(tunnel.y * 6.28318);
    vec3 color = 0.52 + 0.48 * cos(
        6.28318 * (tunnel.y * 0.08 + tunnel.x) + vec3(0.0, 2.0, 4.0)
    );
    color *= beam * pulse * smoothstep(1.4, 0.05, radius) * 0.35;

    fragColor = vec4(color, 1.0);
}`,
  },
  {
    name: "Aurora veil",
    source: `// Aurora veil — layered procedural curtains over a polar night.
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x),
               mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1)), f.x), f.y);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    vec3 color = mix(vec3(0.004, 0.008, 0.025), vec3(0.02, 0.035, 0.07), uv.y + 0.5);

    for (float i = 0.0; i < 5.0; i++) {
        float speed = iTime * (0.09 + i * 0.012);
        float n = valueNoise(vec2(uv.x * (1.7 + i * 0.2) + speed, i * 3.7));
        float curtain = uv.y - 0.12 - (n - 0.5) * 0.75 + i * 0.055;
        float glow = exp(-13.0 * abs(curtain)) * (0.8 - i * 0.1);
        vec3 tint = mix(vec3(0.08, 1.0, 0.56), vec3(0.42, 0.18, 1.0), i / 4.0);
        color += tint * glow * 0.36;
    }

    float stars = step(0.997, hash21(floor(fragCoord * 0.65)));
    color += stars * vec3(0.7, 0.85, 1.0);
    color *= 1.0 - 0.2 * dot(uv * 0.6, uv * 0.6);
    fragColor = vec4(color, 1.0);
}`,
  },
  {
    name: "Crystal mandala",
    source: `// Crystal mandala — mirrored polar geometry with spectral edges.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    float radius = length(uv);
    float angle = atan(uv.y, uv.x) + iTime * 0.08;
    float sector = 6.283185 / 12.0;
    angle = abs(mod(angle + sector * 0.5, sector) - sector * 0.5);
    vec2 p = vec2(cos(angle), sin(angle)) * radius;

    p = abs(fract(p * 3.2 - iTime * 0.04) - 0.5);
    float facet = abs(p.x + p.y - 0.42);
    float edge = 0.012 / max(facet, 0.003);
    float rings = 0.008 / max(abs(fract(radius * 5.0 - iTime * 0.08) - 0.5), 0.004);

    vec3 spectrum = 0.55 + 0.45 * cos(
        6.28318 * (radius * 0.55 + angle) + vec3(0.0, 2.1, 4.2)
    );
    vec3 color = spectrum * edge * 0.34;
    color += spectrum.zxy * rings * 0.12;
    color *= exp(-0.38 * radius);
    color = 1.0 - exp(-color);

    fragColor = vec4(color, 1.0);
}`,
  },
  {
    name: "Plasma cells",
    source: `// Plasma cells — animated Voronoi membranes.
vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.y * 5.0;
    vec2 cell = floor(uv);
    vec2 local = fract(uv);
    float nearest = 10.0;
    float second = 10.0;

    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 point = hash22(cell + offset);
            point = 0.5 + 0.42 * sin(iTime * 0.7 + 6.28318 * point);
            float d = length(offset + point - local);
            if (d < nearest) { second = nearest; nearest = d; }
            else if (d < second) { second = d; }
        }
    }

    float membrane = second - nearest;
    float edge = exp(-30.0 * membrane);
    float pulse = 0.5 + 0.5 * sin(nearest * 12.0 - iTime * 2.0);
    vec3 deep = vec3(0.015, 0.01, 0.06);
    vec3 plasma = 0.55 + 0.45 * cos(nearest * 5.0 + iTime * 0.3 + vec3(0.2, 2.2, 4.3));
    vec3 color = mix(deep, plasma * (0.35 + pulse * 0.45), smoothstep(0.75, 0.05, nearest));
    color += edge * vec3(1.0, 0.55, 0.18) * 1.4;
    fragColor = vec4(color, 1.0);
}`,
  },
  {
    name: "Star warp",
    source: `// Star warp — layered star fields accelerating toward the viewer.
float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec3 starLayer(vec2 uv, float depth) {
    vec2 grid = fract(uv * 8.0) - 0.5;
    vec2 id = floor(uv * 8.0);
    float seed = hash21(id);
    vec2 pos = vec2(seed, fract(seed * 34.0)) - 0.5;
    float d = length(grid - pos * 0.65);
    float star = 0.012 / max(d, 0.008);
    star *= smoothstep(0.82, 1.0, seed);
    vec3 tint = mix(vec3(0.3, 0.55, 1.0), vec3(1.0, 0.48, 0.2), seed);
    return tint * star * depth;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    vec3 color = vec3(0.003, 0.005, 0.015);
    float t = iTime * 0.35;

    for (float i = 0.0; i < 5.0; i++) {
        float depth = fract(i / 5.0 + t);
        float scale = mix(0.35, 2.8, depth);
        vec2 drift = uv * scale + vec2(i * 13.17, i * 7.31);
        color += starLayer(drift, depth) * smoothstep(0.0, 0.12, depth);
    }

    float centerGlow = 0.012 / max(length(uv), 0.025);
    color += centerGlow * vec3(0.12, 0.22, 0.5);
    color = 1.0 - exp(-color);
    fragColor = vec4(color, 1.0);
}`,
  },
  {
    name: "Magnetic ink",
    source: `// Magnetic ink — the pointer pulls a field of liquid metal.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    vec2 mouse = (2.0 * iMouse.xy - iResolution.xy) / iResolution.y;
    if (iMouse.x <= 0.0) mouse = vec2(0.0);

    float field = 0.0;
    for (float i = 0.0; i < 7.0; i++) {
        float angle = i * 0.897 + iTime * (0.18 + i * 0.012);
        vec2 orbit = mouse + vec2(cos(angle), sin(angle)) * (0.12 + i * 0.055);
        field += 0.025 / max(length(uv - orbit), 0.012);
    }

    float body = smoothstep(0.28, 0.72, field);
    float surface = 0.5 + 0.5 * sin(field * 3.2 - iTime * 1.5);
    float highlight = pow(surface, 14.0) * body;
    float rim = exp(-34.0 * abs(field - 0.48));
    vec3 steel = mix(vec3(0.004, 0.007, 0.012), vec3(0.055, 0.09, 0.12) + surface * 0.16, body);
    steel += highlight * vec3(0.62, 0.92, 1.0) * 1.3;
    steel += rim * vec3(0.18, 0.75, 1.0) * 0.9;
    fragColor = vec4(steel, 1.0);
}`,
  },
  {
    name: "Gravity grid",
    source: `// Gravity grid — move the pointer to bend luminous space.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    vec2 mouse = (2.0 * iMouse.xy - iResolution.xy) / iResolution.y;
    if (iMouse.x <= 0.0) mouse = vec2(0.0);

    vec2 delta = uv - mouse;
    float radius = max(length(delta), 0.035);
    vec2 warped = uv + normalize(delta) * (0.14 / radius - 0.14);
    warped += 0.018 * sin(iTime + warped.yx * 5.0);

    vec2 grid = abs(fract(warped * 8.0) - 0.5);
    float line = min(grid.x, grid.y);
    float glow = 0.018 / max(line, 0.005);
    float lens = 0.014 / max(abs(radius - 0.22), 0.004);

    vec3 color = vec3(0.005, 0.008, 0.018);
    color += glow * vec3(0.08, 0.42, 0.7) * 0.24;
    color += lens * vec3(0.58, 0.22, 1.0) * 0.3;
    color *= smoothstep(0.055, 0.16, radius);
    color = 1.0 - exp(-color);
    fragColor = vec4(color, 1.0);
}`,
  },
  {
    name: "Kinetic petals",
    source: `// Kinetic petals — pointer position controls the bloom.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    vec2 mouse = (2.0 * iMouse.xy - iResolution.xy) / iResolution.y;
    if (iMouse.x <= 0.0) mouse = vec2(0.0);

    vec2 p = uv - mouse * 0.45;
    float radius = length(p);
    float angle = atan(p.y, p.x);
    float mouseSpeed = length(mouse) * 2.0;
    float petals = 7.0 + floor(mouseSpeed * 2.0);
    float shape = 0.34 + 0.11 * cos(angle * petals + iTime * 0.8);
    shape += 0.035 * sin(angle * petals * 2.0 - iTime * 1.3);
    float edge = 0.012 / max(abs(radius - shape), 0.003);
    float inner = smoothstep(shape, shape - 0.16, radius);

    vec3 tint = 0.52 + 0.48 * cos(
        angle * 1.5 + iTime * 0.25 + vec3(0.2, 2.3, 4.5)
    );
    vec3 color = tint * edge * 0.45;
    color += inner * tint.zxy * 0.16;
    color += 0.006 / max(radius, 0.012) * vec3(0.8, 0.9, 1.0);
    color = 1.0 - exp(-color);
    fragColor = vec4(color, 1.0);
}`,
  },
  {
    name: "Ocean caustics",
    source: `// Ocean caustics — refracted sunlight beneath moving water.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    float t = iTime * 0.32;
    vec2 q = p * 3.2;

    for (float i = 1.0; i < 6.0; i++) {
        q += vec2(cos(q.y * i + t), sin(q.x * i - t * 1.2)) / i;
    }

    float caustic = pow(max(0.0, 0.72 + 0.28 * sin(q.x * 3.0) * sin(q.y * 3.0)), 9.0);
    float depth = smoothstep(0.0, 1.0, uv.y);
    vec3 water = mix(vec3(0.005, 0.08, 0.13), vec3(0.0, 0.36, 0.48), depth);
    water += caustic * vec3(0.42, 0.95, 0.88) * 1.25;
    water += 0.04 * sin(q.xyx + vec3(0.0, 2.0, 4.0));
    fragColor = vec4(water, 1.0);
}`,
  },
  {
    name: "Synthwave horizon",
    source: `// Synthwave horizon — a setting sun above an endless grid.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    vec3 color = mix(vec3(0.015, 0.005, 0.06), vec3(0.2, 0.015, 0.2), uv.y + 0.45);

    vec2 sunPos = uv - vec2(0.0, 0.26);
    float sun = smoothstep(0.29, 0.275, length(sunPos));
    float cuts = step(0.045, mod(sunPos.y + iTime * 0.025, 0.075));
    color = mix(color, vec3(1.0, 0.22, 0.34) + uv.y * vec3(0.9, 0.55, 0.0), sun * cuts);

    if (uv.y < -0.08) {
        vec2 road = vec2(uv.x / max(-uv.y, 0.02), 0.14 / max(-uv.y, 0.02) + iTime * 0.45);
        vec2 grid = abs(fract(road * vec2(1.8, 1.0)) - 0.5);
        float lines = min(grid.x, grid.y);
        float glow = 0.018 / max(lines, 0.008);
        color = vec3(0.006, 0.003, 0.025) + glow * vec3(0.25, 0.02, 0.65);
    }

    float horizon = 0.01 / max(abs(uv.y + 0.08), 0.004);
    color += horizon * vec3(1.0, 0.08, 0.45) * 0.3;
    fragColor = vec4(color, 1.0);
}`,
  },
  {
    name: "Glass bubbles",
    source: `// Glass bubbles — floating lenses that refract a color field.
float hash(float n) {
    return fract(sin(n * 91.345) * 47453.5453);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    vec3 color = vec3(0.012, 0.016, 0.028);

    for (float i = 0.0; i < 9.0; i++) {
        float seed = hash(i + 1.0);
        vec2 center = vec2(hash(i * 2.1) - 0.5, hash(i * 4.7) - 0.5);
        center.x *= 1.8;
        center.y += 0.16 * sin(iTime * (0.22 + seed * 0.2) + i * 2.0);
        float radius = 0.08 + seed * 0.16;
        float d = length(uv - center);
        float shell = 0.008 / max(abs(d - radius), 0.003);
        float glass = smoothstep(radius, radius * 0.72, d);
        vec3 spectral = 0.5 + 0.5 * cos(8.0 * d + i + vec3(0.0, 2.1, 4.2));
        color += shell * spectral * 0.24;
        color += glass * spectral * 0.055;
        color += pow(max(0.0, 1.0 - length((uv - center - vec2(-0.04, 0.05)) / radius)), 22.0);
    }

    color = 1.0 - exp(-color);
    fragColor = vec4(color, 1.0);
}`,
  },
  {
    name: "Velvet dunes",
    source: `// Velvet dunes — quiet layered terrain at dusk.
float ridge(float x) {
    return sin(x) * 0.55 + sin(x * 2.17 + 1.3) * 0.22 + sin(x * 4.03) * 0.08;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    float t = iTime * 0.06;
    vec3 sky = mix(vec3(0.025, 0.018, 0.08), vec3(0.68, 0.19, 0.24), smoothstep(0.8, -0.35, uv.y));
    vec3 color = sky;

    float moon = smoothstep(0.12, 0.105, length(uv - vec2(0.42, 0.38)));
    color = mix(color, vec3(1.0, 0.72, 0.48), moon);

    for (float i = 0.0; i < 6.0; i++) {
        float depth = i / 5.0;
        float y = -0.5 + depth * 0.15 + ridge(uv.x * (1.5 + depth) + t + i) * (0.08 + depth * 0.035);
        float mask = smoothstep(y + 0.012, y, uv.y);
        vec3 dune = mix(vec3(0.055, 0.025, 0.09), vec3(0.34, 0.075, 0.13), depth);
        float rim = exp(-80.0 * abs(uv.y - y));
        color = mix(color, dune + rim * vec3(0.8, 0.18, 0.2) * 0.18, mask);
    }

    fragColor = vec4(color, 1.0);
}`,
  },
] as const;

const gravityGrid = exampleCatalog.find((example) => example.name === "Gravity grid");
if (!gravityGrid) throw new Error("Gravity Grid example is missing");
const examples = [gravityGrid, ...exampleCatalog.filter((example) => example !== gravityGrid)];

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app");

app.innerHTML = `
  <div class="app-shell">
    <header>
      ${BRAND_HTML}
      <span class="badge"><i></i> WebGL2</span>
      <nav class="page-links">
        <a href="/shaders.html" aria-current="page">Shader gallery</a>
        <a href="/feedback.html">Feedback ink</a>
        <a href="/particles.html">Particles</a>
        <a href="/geometry.html">Geometry</a>
        <a href="/texture.html">Texture</a>
      </nav>
      ${PACKAGE_LINK_HTML}
    </header>

    <main>
      <section class="preview">
        <canvas id="canvas"></canvas>
        <span class="hint">Move your pointer</span>
      </section>

      <aside>
        <div class="panel-title">
          <div>
            <span class="eyebrow">First experiment</span>
            <h1>Shader canvas</h1>
          </div>
          <button id="pauseButton" class="quiet">Pause</button>
        </div>

        <label class="example-picker">
          <span>Example</span>
          <select id="exampleSelect" aria-label="Choose a shader example">
            ${examples.map((example, index) => `<option value="${index}">${String(index + 1).padStart(2, "0")} — ${example.name}</option>`).join("")}
          </select>
        </label>

        <div class="editor-wrap">
          <textarea id="editor" spellcheck="false" aria-label="Fragment shader source"></textarea>
        </div>

        <div id="status" class="status" data-kind="ready">
          <span><i></i><b id="statusText">Ready</b></span>
          <span>GLSL ES 3.00</span>
        </div>

        <div class="actions">
          <button id="resetButton" class="quiet">Reset</button>
          <button id="runButton" class="run">Run shader <span>⌘↵</span></button>
        </div>
      </aside>
    </main>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#canvas")!;
const editor = document.querySelector<HTMLTextAreaElement>("#editor")!;
const status = document.querySelector<HTMLDivElement>("#status")!;
const statusText = document.querySelector<HTMLElement>("#statusText")!;
const runButton = document.querySelector<HTMLButtonElement>("#runButton")!;
const pauseButton = document.querySelector<HTMLButtonElement>("#pauseButton")!;
const exampleSelect = document.querySelector<HTMLSelectElement>("#exampleSelect")!;

const header = `#version 300 es
precision highp float;
out vec4 glFragColor;
uniform vec3 iResolution;
uniform float iTime;
uniform int iFrame;
uniform vec4 iMouse;
`;
const footer = `
void main() {
    mainImage(glFragColor, gl_FragCoord.xy);
}`;

const engine = createGLEngine(canvas, { alpha: false, antialias: false });
setHardwareScalingLevel(engine, 1 / Math.min(devicePixelRatio || 1, 2));

let active: GLEffectWrapper | null = null;
let pending: GLEffectWrapper | null = null;
let playing = true;
let time = 0;
let frame = 0;
let previous = performance.now();
let mouseX = 0;
let mouseY = 0;
let mouseDown = false;

function showStatus(kind: "ready" | "working" | "error", message: string): void {
  status.dataset.kind = kind;
  statusText.textContent = message;
}

function compileShader(): void {
  if (pending) disposeEffectWrapper(pending);
  pending = null;
  showStatus("working", "Compiling…");

  try {
    pending = createEffectWrapper(engine, {
      name: "playground-shader",
      fragmentSource: `${header}\n${editor.value}\n${footer}`,
      uniformNames: ["iResolution", "iTime", "iFrame", "iMouse"],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showStatus("error", message.replace(/^lite-gl: playground-shader fragment compile failed:\s*/, ""));
  }
}

function checkPending(): void {
  if (!pending) return;
  if (isEffectReady(engine, pending.effect)) {
    if (active) disposeEffectWrapper(active);
    active = pending;
    pending = null;
    showStatus("ready", "Running");
    return;
  }

  const effect = pending.effect as typeof pending.effect & { _compileError?: string | null };
  if (effect._compileError) {
    const message = effect._compileError;
    disposeEffectWrapper(pending);
    pending = null;
    showStatus("error", message);
  }
}

function reset(): void {
  editor.value = examples[Number(exampleSelect.value)].source;
  time = 0;
  frame = 0;
  compileShader();
}

runButton.addEventListener("click", compileShader);
document.querySelector<HTMLButtonElement>("#resetButton")!.addEventListener("click", reset);
exampleSelect.addEventListener("change", reset);
pauseButton.addEventListener("click", () => {
  playing = !playing;
  pauseButton.textContent = playing ? "Pause" : "Play";
  previous = performance.now();
});
editor.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    compileShader();
  }
  if (event.key === "Tab") {
    event.preventDefault();
    editor.setRangeText("    ", editor.selectionStart, editor.selectionEnd, "end");
  }
});
canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = (event.clientX - rect.left) / rect.width * canvas.width;
  mouseY = (rect.bottom - event.clientY) / rect.height * canvas.height;
});
canvas.addEventListener("pointerdown", () => { mouseDown = true; });
canvas.addEventListener("pointerup", () => { mouseDown = false; });

runRenderLoop(engine, () => {
  const now = performance.now();
  const delta = Math.min((now - previous) / 1000, 0.1);
  previous = now;
  if (playing) time += delta;

  resizeGLEngine(engine);
  checkPending();
  if (!active || !isEffectReady(engine, active.effect)) return;

  setViewport(engine);
  applyEffectWrapper(active);
  setEffectFloat3(engine, active.effect, "iResolution", canvas.width, canvas.height, 1);
  setEffectFloat(engine, active.effect, "iTime", time);
  setEffectInt(engine, active.effect, "iFrame", frame);
  setEffectFloat4(engine, active.effect, "iMouse", mouseX, mouseY, mouseDown ? mouseX : -mouseX, mouseDown ? mouseY : -mouseY);
  drawEffect(engine);
  if (playing) frame++;
});

const requestedExample = Number(new URLSearchParams(location.search).get("example"));
if (Number.isInteger(requestedExample) && requestedExample >= 0 && requestedExample < examples.length) {
  exampleSelect.value = String(requestedExample);
}
reset();
