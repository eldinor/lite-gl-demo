import { defineConfig } from "vite";
import packageManifest from "./package.json";

export default defineConfig({
  define: {
    __LITE_GL_VERSION__: JSON.stringify(packageManifest.dependencies["@babylonjs/lite-gl"]),
  },
  build: {
    rollupOptions: {
      input: {
        home: "index.html",
        gallery: "shaders.html",
        feedback: "feedback.html",
        particles: "particles.html",
        geometry: "geometry.html",
        texture: "texture.html",
      },
    },
  },
});
