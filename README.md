# Lite GL shader demo

A small editable WebGL2 shader canvas built with `@babylonjs/lite-gl`.

It includes a Living Surface homepage plus dedicated shader, feedback, particle,
geometry, and texture-experiment pages. The texture page contains Kaleido Bloom
and Chromatic Weave; Living Surface remains exclusive to the homepage.

```bash
npm install
npm run dev
```

Edit `mainImage` in the browser and press **Run shader** or `Ctrl/Cmd + Enter`.
The demo exposes the Shadertoy-style uniforms `iResolution`, `iTime`, `iFrame`,
and `iMouse` so it can grow into a fuller shader playground later.
