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
        header: "header.html",
        headerOrbit: "header-orbit.html",
        headerLight: "header-light.html",
        headerNav: "header-nav.html",
        headerNavPrism: "header-nav-prism.html",
        headerFlowPrism: "header-flow-prism.html",
        headerDualCanvas: "header-dual-canvas.html",
        headerNetworkLight: "header-network-light.html",
        headerNetworkPlot: "header-network-plot.html",
      },
    },
  },
});
