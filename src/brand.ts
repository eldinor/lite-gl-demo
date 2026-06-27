declare const __LITE_GL_VERSION__: string;

export const LITE_GL_VERSION = __LITE_GL_VERSION__;
export const BRAND_HTML = `<a class="brand" href="/"><span>LITE-GL</span><small>v${LITE_GL_VERSION}</small><em>Demo</em></a>`;
export const PACKAGE_LINK_HTML = `
  <div class="header-links">
    <a class="package-link" href="https://www.npmjs.com/package/@babylonjs/lite-gl" target="_blank" rel="noreferrer">@babylonjs/lite-gl v${LITE_GL_VERSION}<span>↗</span></a>
    <div class="project-links">
      <a class="icon-link github-link" href="https://github.com/eldinor/lite-gl-demo" target="_blank" rel="noreferrer" aria-label="LITE-GL Demo on GitHub" title="LITE-GL Demo on GitHub">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.24c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.78 1.2 1.78 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.57-.29-5.28-1.28-5.28-5.68 0-1.26.45-2.28 1.19-3.08-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.16 1.18a10.98 10.98 0 0 1 5.76 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.58.23 2.75.11 3.04.74.8 1.19 1.82 1.19 3.08 0 4.41-2.71 5.38-5.29 5.67.42.36.79 1.06.79 2.14v3.18c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"/></svg>
      </a>
      <a class="bp-link" href="https://babylonpress.org/" target="_blank" rel="noreferrer" aria-label="BabylonPress" title="BabylonPress">
        <img src="https://raw.githubusercontent.com/eldinor/bp900/refs/heads/main/public/bplogo.svg" alt="BabylonPress" />
      </a>
    </div>
  </div>`;
