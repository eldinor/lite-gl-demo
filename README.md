# LITE-GL Demo

An interactive WebGL2 showcase for
[`@babylonjs/lite-gl`](https://www.npmjs.com/package/@babylonjs/lite-gl): a
small, function-based rendering toolkit from the Babylon.js ecosystem.

This project explores the library beyond a single shader. It includes editable
fragment programs, GPU feedback, batched sprites, instanced geometry, HDR
post-processing, and live Canvas 2D textures—all in a dependency-light Vite +
TypeScript application.

Repository: [eldinor/lite-gl-demo](https://github.com/eldinor/lite-gl-demo)

Live demo: [litegl.babylonpress.org](https://litegl.babylonpress.org)

## Demo pages

| Route | Demo | What it shows |
| --- | --- | --- |
| `/` | **Living Surface** | Canvas 2D uploaded every frame as a dynamic texture, pointer refraction, and chromatic sampling |
| `/shaders.html` | **Shader Gallery** | Editable Shadertoy-style fragment shaders with live compilation and mouse uniforms |
| `/feedback.html` | **Feedback Ink** | Ping-pong render targets, GPU diffusion, persistent pointer trails, and two-pass rendering |
| `/particles.html` | **Particle Field** | 1,400 batched sprites, procedural textures, additive blending, and pointer-driven motion |
| `/geometry.html` | **Crystal Matrix** | Indexed meshes, 504 instances, VAOs, depth/culling, an HDR target, bloom, and tone mapping |
| `/texture.html` | **Texture Experiments** | Kaleido Bloom and Chromatic Weave using mirrored, tiled, and refracted dynamic textures |

## `lite-gl` features demonstrated

- Engine creation, resizing, render loops, and hardware scaling
- GLSL effect compilation and cached uniform setters
- Fullscreen effect wrappers
- Raw and dynamic textures
- Render-to-texture and ping-pong feedback
- Float/HDR render targets
- Procedural sprite sheets and batched sprite rendering
- Additive blending
- Vertex/index buffers, VAOs, and instanced mesh draws
- Depth testing and face culling
- Multi-pass bloom and tone mapping
- Pointer-driven interactive uniforms

## Quick start

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The homepage starts with **Living Surface**;
the header links to every other demo.

## Scripts

```bash
npm run dev      # Start the Vite development server
npm run build    # Type-check and build every HTML entry point
npm run preview  # Preview the production build locally
```

Production files are written to `dist/`.

## Shader gallery

Gallery shaders implement the familiar Shadertoy entry point:

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Your fragment shader
}
```

Available uniforms:

| Uniform | Type | Description |
| --- | --- | --- |
| `iResolution` | `vec3` | Canvas width, height, and pixel aspect |
| `iTime` | `float` | Elapsed animation time in seconds |
| `iFrame` | `int` | Rendered frame counter |
| `iMouse` | `vec4` | Current pointer and press coordinates |

Press **Run shader** or `Ctrl/Cmd + Enter` to compile. Compilation errors are
shown without discarding the last working shader.

## Project structure

```text
├─ index.html              Living Surface homepage
├─ shaders.html            Editable shader gallery
├─ feedback.html           Ping-pong feedback demo
├─ particles.html          Batched sprite demo
├─ geometry.html           Instanced HDR geometry demo
├─ texture.html            Additional texture experiments
├─ src/
│  ├─ main.ts              Shader gallery and examples
│  ├─ feedback.ts          Feedback render-target pipeline
│  ├─ particles.ts         Sprite simulation and renderer
│  ├─ geometry.ts          Instanced mesh and HDR pipeline
│  ├─ texture-demo.ts      Dynamic Canvas texture experiments
│  ├─ brand.ts             Shared versioned header links
│  └─ *.css                Page and shared presentation styles
└─ vite.config.ts          Multi-page build configuration
```

The displayed `lite-gl` version is injected from the dependency declared in
`package.json`, keeping the header synchronized with the installed package.

## Browser support

The demos require **WebGL2** and modern ES modules. Recent versions of Chrome,
Edge, Firefox, and Safari are the intended targets. The demos cannot run when a
WebGL2 context is unavailable.

## Deployment

Run `npm run build` and deploy the contents of `dist/` to any static host. The
project is a multi-page application, so the host should serve the generated
HTML files directly rather than rewriting every route to `index.html`.

## Links

- [`@babylonjs/lite-gl` on npm](https://www.npmjs.com/package/@babylonjs/lite-gl)
- [LITE-GL Demo on GitHub](https://github.com/eldinor/lite-gl-demo)
- [BabylonPress](https://babylonpress.org/)

Created by [Andrei Stepanov](https://babylonpress.org/).
