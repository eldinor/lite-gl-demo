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
import "./header-dual.css";

const app = document.querySelector<HTMLDivElement>("#dualHeaderApp");
if (!app) throw new Error("Missing #dualHeaderApp");
const networkTheme = app.dataset.networkTheme;
const isLightNetwork = networkTheme === "light" || networkTheme === "plot";
const isPlotNetwork = networkTheme === "plot";

app.innerHTML = `
  <div class="site-shell light-theme nav-prism dual-canvas${isLightNetwork ? " network-light" : ""}${isPlotNetwork ? " network-plot" : ""}">
    <canvas id="heroEffectCanvas" aria-hidden="true"></canvas>
    <canvas id="navEffectCanvas" aria-hidden="true"></canvas>
    <div class="noise" aria-hidden="true"></div>
    <header class="site-header">
      <a class="wordmark" href="#" aria-label="Northstar home"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 1.5 19.7 12 30.5 16l-10.8 4L16 30.5 12.2 20 1.5 16l10.7-4L16 1.5Z"/><circle cx="16" cy="16" r="3.5"/></svg><span>Northstar</span></a>
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="siteNav"><span></span><span></span><span class="sr-only">Open menu</span></button>
      <nav id="siteNav" aria-label="Main navigation"><a href="#platform">Platform</a><a href="#solutions">Solutions</a><a href="#customers">Customers</a><a href="#resources">Resources</a><a href="#pricing">Pricing</a></nav>
      <div class="header-actions"><a class="login" href="#login">Log in</a><a class="start" href="#start">Start building <span>↗</span></a></div>
    </header>
    <main class="hero">
      <div class="hero-copy">
        <a class="announcement" href="#release"><span>New</span> Spatial workflows are here <i>→</i></a>
        <p class="eyebrow">Intelligence for physical operations</p>
        <h1>See the whole field.<br/><em>Move as one.</em></h1>
        <p class="lede">Northstar brings live operations, asset data, and your team into one shared view—so every decision starts with the full picture.</p>
        <div class="hero-actions"><a class="primary" href="#demo">Book a demo <span>→</span></a><a class="secondary" href="#overview"><i></i> Watch overview <small>2:14</small></a></div>
      </div>
      <aside class="signal-card" aria-label="Live network sample data">
        <div class="signal-head"><span><i></i>Babylon Lite-GL</span><time>${isPlotNetwork ? "3D Plot" : isLightNetwork ? "Dancing Meshes" : "14:32 UTC"}</time></div>
        <div class="signal-map" aria-hidden="true"><canvas id="cardEffectCanvas"></canvas>${isPlotNetwork ? `<div class="plot-stats"><div><span>Elevation</span><b id="plotElevation">—</b></div><div><span>Peak</span><b id="plotPeak">—</b></div><div><span>Range</span><b id="plotRange">—</b></div><div><span>Scan</span><b id="plotScan">—</b></div></div>` : ""}</div>
      </aside>
    </main>
    <footer class="proof"><span>Trusted in the field by</span><div><b>ARC//ONE</b><b>MONUMENT</b><b>VECTOR LABS</b><b>FIELDWORK</b></div><small>Scroll to explore <i>↓</i></small></footer>
  </div>`;

const flowShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p);vec2 f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
float fbm(vec2 p){float v=0.0;float a=0.52;for(int i=0;i<5;i++){v+=a*noise(p);p=mat2(0.82,0.57,-0.57,0.82)*p*2.04+4.8;a*=0.48;}return v;}
void main(){
  vec2 uv=vUv;float aspect=uResolution.x/max(uResolution.y,1.0);vec2 p=(uv-0.5)*vec2(aspect,1.0);float t=uTime*0.07;
  vec2 pointer=(uPointer-0.5)*vec2(0.14*aspect,0.1);vec2 q=p-vec2(aspect*0.02,-0.24)+pointer;
  float broad=fbm(q*0.68+vec2(t,-t*0.55));float folded=fbm(q*1.18+vec2(-t*0.72,t*0.4)+broad*1.65);
  float waveA=q.y+(broad-0.5)*0.78+sin(q.x*1.8-t)*0.08;float waveB=q.y-0.24+(folded-0.5)*0.58-sin(q.x*2.2+t*0.8)*0.055;
  float ribbonA=exp(-abs(waveA)*5.8);float ribbonB=exp(-abs(waveB)*10.0);float edgeA=exp(-abs(abs(waveA)-0.12)*62.0);float edgeB=exp(-abs(abs(waveB)-0.075)*82.0);
  vec3 color=vec3(0.965,0.978,0.995);color=mix(color,vec3(0.42,0.69,1.0),ribbonA*0.52);color=mix(color,vec3(0.18,0.48,0.98),ribbonB*0.42);
  color+=edgeA*vec3(0.08,0.40,1.0)*0.34+edgeB*vec3(0.02,0.28,0.92)*0.26;
  float contours=1.0-smoothstep(0.025,0.065,abs(fract(folded*15.0)-0.5));color-=contours*vec3(0.08,0.23,0.48)*ribbonA*0.075;
  color+=exp(-length(q-vec2(0.03,0.01))*3.8)*vec3(0.05,0.24,0.62)*0.10;float mask=smoothstep(-aspect*0.48,-aspect*0.08,p.x);
  color=mix(vec3(0.978,0.984,0.992),color,0.30+0.70*mask);color+=(hash(gl_FragCoord.xy+uTime*0.1)-0.5)/510.0;glFragColor=vec4(color,1.0);
}`;

const prismShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float facet(vec2 p,vec2 d,float phase){float c=dot(p,d)+phase;float b=abs(fract(c)-0.5);return 1.0-smoothstep(0.42,0.5,b);}
void main(){
  vec2 uv=vUv;float aspect=uResolution.x/max(uResolution.y,1.0);vec2 p=(uv-0.5)*vec2(aspect,1.0);float t=uTime*0.075;
  vec3 color=mix(vec3(0.018,0.105,0.39),vec3(0.035,0.28,0.78),uv.x);color+=vec3(0.015,0.08,0.24)*(1.0-uv.y)*0.48;
  float a=facet(p*0.24,normalize(vec2(0.86,0.50)),t);float b=facet(p*0.19,normalize(vec2(-0.72,0.69)),-t*0.74+0.3);float c=facet(p*0.31,normalize(vec2(0.96,-0.28)),t*0.48+0.67);
  color+=a*vec3(0.03,0.18,0.42)*0.22+b*vec3(0.10,0.28,0.62)*0.18-c*vec3(0.01,0.05,0.16)*0.14;
  float seamA=1.0-smoothstep(0.008,0.024,abs(fract(dot(p,vec2(0.19,0.34))+t)-0.5));float seamB=1.0-smoothstep(0.008,0.026,abs(fract(dot(p,vec2(-0.14,0.42))-t*0.63)-0.5));
  color+=(seamA+seamB)*vec3(0.30,0.66,1.0)*0.19;float px=(uPointer.x-0.5)*aspect;float sweep=exp(-abs(p.x-px)*0.48);float refract=sin((p.x-px)*1.7+p.y*4.0-t*2.0)*0.5+0.5;
  color+=sweep*refract*vec3(0.10,0.38,0.92)*0.27+exp(-abs(uv.y-0.92)*22.0)*vec3(0.20,0.52,1.0)*0.18;color+=(hash(gl_FragCoord.xy+uTime*0.1)-0.5)/330.0;glFragColor=vec4(color,1.0);
}`;

const networkShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;
uniform float uLightMode;

float hash(float n){return fract(sin(n*91.3458)*47453.5453);}
vec3 nodePosition(float index,float time){
  float seed=hash(index+3.7);
  vec3 point=vec3(
    mix(-1.55,1.55,hash(index*2.17+1.3)),
    mix(-0.82,0.82,hash(index*5.31+8.1)),
    mix(-0.95,0.95,hash(index*7.13+2.8))
  );
  point.x+=sin(time*(0.16+seed*0.12)+index*2.4)*0.10;
  point.y+=cos(time*(0.13+seed*0.11)+index*1.7)*0.08;
  point.z+=sin(time*0.18+index*0.9)*0.11;
  return point;
}
vec2 projectPoint(vec3 point,float yaw,float pitch,float aspect,out float depth){
  float cy=cos(yaw);float sy=sin(yaw);
  point.xz=mat2(cy,-sy,sy,cy)*point.xz;
  float cp=cos(pitch);float sp=sin(pitch);
  point.yz=mat2(cp,-sp,sp,cp)*point.yz;
  point.z+=3.25;
  depth=point.z;
  return vec2(0.5)+vec2(point.x/aspect,point.y)*1.38/max(depth,0.2);
}
float segmentDistance(vec2 p,vec2 a,vec2 b){
  vec2 pa=p-a;vec2 ba=b-a;
  float h=clamp(dot(pa,ba)/max(dot(ba,ba),0.0001),0.0,1.0);
  return length(pa-ba*h);
}
void main(){
  vec2 uv=vUv;float aspect=uResolution.x/max(uResolution.y,1.0);vec2 scale=vec2(aspect,1.0);float t=uTime;
  vec2 centered=(uv-0.5)*scale;
  float yaw=(uPointer.x-0.5)*1.05+sin(t*0.10)*0.16;
  float pitch=(uPointer.y-0.5)*0.58;
  vec3 darkBase=mix(vec3(0.004,0.012,0.046),vec3(0.010,0.058,0.145),uv.y);
  vec3 lightBase=mix(vec3(0.975,0.986,1.0),vec3(0.83,0.91,1.0),uv.y*0.72);
  vec3 color=mix(darkBase,lightBase,uLightMode);
  float ambient=exp(-length(centered-vec2(0.28,0.03))*1.5);
  color+=ambient*vec3(0.01,0.10,0.28)*0.72*(1.0-uLightMode);

  // A receding horizon and perspective floor establish the camera space.
  float horizon=exp(-abs(uv.y-0.47)*75.0);
  float floorY=max(0.001,0.47-uv.y);
  float perspectiveDepth=0.12/floorY;
  float floorX=uv.x*aspect*perspectiveDepth+yaw*0.35;
  float floorGridX=1.0-smoothstep(0.015,0.045,abs(fract(floorX)-0.5));
  float floorGridZ=1.0-smoothstep(0.025,0.065,abs(fract(perspectiveDepth-t*0.10)-0.5));
  float floorFade=(1.0-smoothstep(0.05,0.47,uv.y))*smoothstep(0.0,0.20,uv.y);
  color+=(floorGridX+floorGridZ)*floorFade*vec3(0.01,0.22,0.55)*mix(0.12,0.035,uLightMode);
  color+=horizon*vec3(0.03,0.46,0.95)*mix(0.25,0.08,uLightMode);

  float links=0.0;float points=0.0;float cores=0.0;
  for(int i=0;i<12;i++){
    float fi=float(i);float depthA;float depthB;
    vec2 a=projectPoint(nodePosition(fi,t),yaw,pitch,aspect,depthA);
    vec2 b=projectPoint(nodePosition(mod(fi+3.0,12.0),t),yaw,pitch,aspect,depthB);
    float depthFade=clamp(1.45-0.22*(depthA+depthB),0.18,1.0);
    float lineDistance=segmentDistance(uv*scale,a*scale,b*scale);
    links+=exp(-lineDistance*(110.0+min(depthA,depthB)*18.0))*0.78*depthFade;
    float pointDistance=length((uv-a)*scale);
    float perspectiveSize=clamp(4.4/depthA,0.72,1.65);
    points+=exp(-pointDistance*34.0/perspectiveSize)*depthFade;
    cores+=exp(-pointDistance*190.0/perspectiveSize)*depthFade*(0.72+0.28*sin(t*2.2+fi*1.9));
  }
  if(uLightMode>0.5){
    float structure=clamp(links*0.30+points*0.10,0.0,0.72);
    color=mix(color,vec3(0.025,0.30,0.88),structure);
    color+=cores*vec3(0.02,0.34,0.96)*0.38;
  }else{
    color+=links*vec3(0.02,0.42,0.98)*0.42;
    color+=points*vec3(0.01,0.65,1.0)*0.31;
    color+=cores*vec3(0.58,0.96,1.0)*1.35;
  }

  vec2 pointerDelta=(uv-uPointer)*scale;
  float pointerDistance=length(pointerDelta);
  float pointerGlow=exp(-pointerDistance*6.0);
  float scanRadius=fract(t*0.13)*0.82;
  float scan=exp(-abs(pointerDistance-scanRadius)*115.0)*(1.0-scanRadius);
  float angle=atan(pointerDelta.y,pointerDelta.x);
  float sweepAngle=mod(t*0.72,6.28318)-3.14159;
  float angleDistance=abs(atan(sin(angle-sweepAngle),cos(angle-sweepAngle)));
  float sweep=exp(-angleDistance*24.0)*exp(-pointerDistance*1.4);
  if(uLightMode>0.5){
    color=mix(color,vec3(0.04,0.36,0.95),clamp(pointerGlow*0.10+scan*0.58+sweep*0.12,0.0,0.48));
  }else{
    color+=pointerGlow*vec3(0.02,0.35,1.0)*0.38;
    color+=scan*vec3(0.20,0.88,1.0)*1.10;
    color+=sweep*vec3(0.01,0.44,0.92)*0.20;
  }

  float vignette=1.0-0.48*length((uv-0.5)*vec2(0.72,1.0));
  color*=vignette;
  glFragColor=vec4(color,1.0);
}`;

const networkLightShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;

mat2 rotate2d(float angle){float c=cos(angle);float s=sin(angle);return mat2(c,-s,s,c);}
float hash(float n){return fract(sin(n*91.3458)*47453.5453);}
float sdBox(vec3 p,vec3 bounds){vec3 q=abs(p)-bounds;return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0);}
float sdOctahedron(vec3 p,float size){p=abs(p);return (p.x+p.y+p.z-size)*0.57735027;}
float sdCylinder(vec3 p,float radius,float halfHeight){return max(length(p.xz)-radius,abs(p.y)-halfHeight);}

float lifecycle(float phase){
  float grow=smoothstep(0.0,0.16,phase);
  float disappear=1.0-smoothstep(0.72,1.0,phase);
  return grow*disappear;
}

float mapScene(vec3 p,out float material){
  float result=p.y+1.05;
  material=4.0;
  for(int i=0;i<8;i++){
    float fi=float(i);
    float phase=fract(uTime*0.085+fi*0.137);
    float life=lifecycle(phase);
    float angle=fi*2.39996;
    vec3 position=vec3(cos(angle)*(0.45+0.25*mod(fi,3.0)),mix(-0.58,0.60,hash(fi*4.2+1.0)),sin(angle)*(0.58+0.18*mod(fi+1.0,3.0)));
    position.y+=sin(uTime*0.32+fi)*0.08+(1.0-life)*0.15;
    vec3 local=p-position;
    local.xz=rotate2d(uTime*(0.12+hash(fi)*0.18)+fi)*local.xz;
    local.xy=rotate2d(uTime*0.09+fi*0.7)*local.xy;
    float size=0.035+life*(0.20+hash(fi+8.0)*0.17);
    float distanceToPrimitive;
    if(i%4==0){distanceToPrimitive=sdBox(local,vec3(size,size*0.78,size));}
    else if(i%4==1){distanceToPrimitive=length(local)-size*0.80;}
    else if(i%4==2){distanceToPrimitive=sdOctahedron(local,size*1.45);}
    else{distanceToPrimitive=sdCylinder(local,size*0.68,size*1.20);}
    distanceToPrimitive+=(1.0-life)*0.28;
    if(distanceToPrimitive<result){result=distanceToPrimitive;material=mod(fi,4.0);}
  }
  return result;
}

vec3 sceneNormal(vec3 p){
  float ignored;float epsilon=0.0018;
  vec2 e=vec2(epsilon,0.0);
  float center=mapScene(p,ignored);
  return normalize(vec3(mapScene(p+e.xyy,ignored)-center,mapScene(p+e.yxy,ignored)-center,mapScene(p+e.yyx,ignored)-center));
}

float softShadow(vec3 origin,vec3 direction){
  float shade=1.0;float travel=0.025;float ignored;
  for(int i=0;i<22;i++){
    float distanceToScene=mapScene(origin+direction*travel,ignored);
    shade=min(shade,12.0*distanceToScene/travel);
    travel+=clamp(distanceToScene,0.018,0.12);
    if(distanceToScene<0.001||travel>4.5)break;
  }
  return clamp(shade,0.18,1.0);
}

vec3 renderScene(vec2 uv){
  float aspect=uResolution.x/max(uResolution.y,1.0);
  vec2 screen=(uv*2.0-1.0)*vec2(aspect,1.0);
  vec3 rayOrigin=vec3(0.0,0.18,4.25);
  vec3 rayDirection=normalize(vec3(screen.x,screen.y,-2.25));
  float yaw=(uPointer.x-0.5)*1.12+sin(uTime*0.08)*0.14;
  float pitch=(uPointer.y-0.5)*0.52-0.08;
  rayOrigin.xz=rotate2d(yaw)*rayOrigin.xz;rayDirection.xz=rotate2d(yaw)*rayDirection.xz;
  rayOrigin.yz=rotate2d(pitch)*rayOrigin.yz;rayDirection.yz=rotate2d(pitch)*rayDirection.yz;

  vec3 color=mix(vec3(0.998,0.996,0.988),vec3(0.91,0.95,0.995),uv.y*0.54);
  float travel=0.0;float material=0.0;bool hit=false;
  for(int i=0;i<72;i++){
    vec3 point=rayOrigin+rayDirection*travel;
    float distanceToScene=mapScene(point,material);
    if(distanceToScene<0.0015){hit=true;break;}
    travel+=distanceToScene*0.78;
    if(travel>8.0)break;
  }

  if(hit){
    vec3 point=rayOrigin+rayDirection*travel;
    vec3 normal=sceneNormal(point);
    vec3 lightDirection=normalize(vec3(-0.55,0.82,0.42));
    float diffuse=max(dot(normal,lightDirection),0.0);
    float shadow=softShadow(point+normal*0.012,lightDirection);
    float fresnel=pow(1.0-max(dot(normal,-rayDirection),0.0),3.0);
    vec3 halfVector=normalize(lightDirection-rayDirection);
    float specular=pow(max(dot(normal,halfVector),0.0),42.0);
    vec3 base;
    if(material<0.5)base=vec3(0.035,0.20,0.86);
    else if(material<1.5)base=vec3(0.90,0.12,0.10);
    else if(material<2.5)base=vec3(0.47,0.70,0.04);
    else if(material<3.5)base=vec3(0.43,0.10,0.72);
    else base=vec3(0.88,0.91,0.95);
    color=base*(0.34+0.66*diffuse*shadow);
    if(material<3.5){
      vec3 tintedHighlight=mix(base,vec3(0.92,0.96,1.0),0.24);
      color=mix(color,tintedHighlight,specular*0.46);
    }else{
      color+=specular*vec3(0.95,0.98,1.0)*0.22;
    }
    color+=fresnel*vec3(0.10,0.42,1.0)*0.32;
    if(material>3.5){
      vec2 grid=abs(fract(point.xz*3.2)-0.5);
      float line=1.0-smoothstep(0.44,0.49,max(grid.x,grid.y));
      color=mix(color,vec3(0.42,0.55,0.72),line*0.28);
    }
  }

  float vignette=1.0-0.10*length(uv-0.5);
  color*=vignette;
  return color;
}

void main(){
  vec2 pixel=1.0/max(uResolution,vec2(1.0));
  vec3 sampleA=renderScene(vUv+pixel*vec2(-0.28,0.28));
  vec3 sampleB=renderScene(vUv+pixel*vec2(0.28,-0.28));
  glFragColor=vec4((sampleA+sampleB)*0.5,1.0);
}`;

const networkPlotShader = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 glFragColor;
uniform vec2 uResolution;
uniform vec2 uPointer;
uniform float uTime;

float plotHeight(vec2 p){
  float waves=sin(p.x*2.8+uTime*0.42)*cos(p.y*2.4-uTime*0.31)*0.22;
  float peakA=exp(-dot(p-vec2(-0.38,0.16),p-vec2(-0.38,0.16))*3.8)*0.52;
  float peakB=exp(-dot(p-vec2(0.52,-0.28),p-vec2(0.52,-0.28))*6.2)*0.34;
  float basin=exp(-dot(p-vec2(0.18,0.48),p-vec2(0.18,0.48))*5.0)*0.28;
  return waves+peakA+peakB-basin-0.10;
}

vec3 plotNormal(vec3 p){
  float e=0.003;
  float left=plotHeight(p.xz-vec2(e,0));
  float right=plotHeight(p.xz+vec2(e,0));
  float back=plotHeight(p.xz-vec2(0,e));
  float front=plotHeight(p.xz+vec2(0,e));
  return normalize(vec3(left-right,2.0*e,back-front));
}

vec3 renderPlot(vec2 uv){
  float aspect=uResolution.x/max(uResolution.y,1.0);
  vec2 screen=(uv*2.0-1.0)*vec2(aspect,1.0);
  float yaw=uTime*0.16+0.72;
  float elevation=0.82+sin(uTime*0.11)*0.10;
  vec3 rayOrigin=vec3(cos(yaw)*2.38,1.12+elevation,sin(yaw)*2.38);
  vec3 target=vec3(0.0,-0.02,0.0);
  vec3 forward=normalize(target-rayOrigin);
  vec3 right=normalize(cross(forward,vec3(0,1,0)));
  vec3 cameraUp=cross(right,forward);
  vec3 rayDirection=normalize(forward*2.62+right*screen.x+cameraUp*screen.y);

  vec3 color=mix(vec3(0.998,0.997,0.992),vec3(0.91,0.95,1.0),uv.y*0.48);
  vec2 safeDirection=rayDirection.xz;
  safeDirection.x=abs(safeDirection.x)<0.00001?(safeDirection.x<0.0?-0.00001:0.00001):safeDirection.x;
  safeDirection.y=abs(safeDirection.y)<0.00001?(safeDirection.y<0.0?-0.00001:0.00001):safeDirection.y;
  vec2 inverseDirection=1.0/safeDirection;
  vec2 bounds=vec2(1.34,1.05);
  vec2 slabA=(-bounds-rayOrigin.xz)*inverseDirection;
  vec2 slabB=(bounds-rayOrigin.xz)*inverseDirection;
  vec2 nearSlab=min(slabA,slabB);
  vec2 farSlab=max(slabA,slabB);
  float entry=max(max(nearSlab.x,nearSlab.y),0.0);
  float exit=min(farSlab.x,farSlab.y);
  float travel=entry;bool hit=false;
  if(exit>entry){
    float previousTravel=entry;
    vec3 entryPoint=rayOrigin+rayDirection*entry;
    float previousDelta=entryPoint.y-plotHeight(entryPoint.xz);
    if(previousDelta<=0.0){
      hit=true;
    }else{
      for(int i=1;i<=144;i++){
        float currentTravel=mix(entry,exit,float(i)/144.0);
        vec3 currentPoint=rayOrigin+rayDirection*currentTravel;
        float currentDelta=currentPoint.y-plotHeight(currentPoint.xz);
        if(previousDelta>0.0&&currentDelta<=0.0){
          float low=previousTravel;float high=currentTravel;
          for(int refinement=0;refinement<8;refinement++){
            float middle=(low+high)*0.5;
            vec3 middlePoint=rayOrigin+rayDirection*middle;
            if(middlePoint.y-plotHeight(middlePoint.xz)>0.0)low=middle;else high=middle;
          }
          travel=(low+high)*0.5;hit=true;break;
        }
        previousDelta=currentDelta;
        previousTravel=currentTravel;
      }
    }
  }

  if(hit){
    vec3 point=rayOrigin+rayDirection*travel;
    vec3 normal=plotNormal(point);
    vec3 lightDirection=normalize(vec3(-0.48,0.82,0.34));
    float diffuse=max(dot(normal,lightDirection),0.0);
    float fresnel=pow(1.0-max(dot(normal,-rayDirection),0.0),3.0);
    float heightValue=clamp((point.y+0.55)/1.15,0.0,1.0);
    vec3 lowColor=vec3(0.04,0.18,0.72);
    vec3 highColor=vec3(0.04,0.72,0.82);
    vec3 surfaceColor=mix(lowColor,highColor,heightValue);

    vec2 gridDistance=abs(fract((point.xz+vec2(1.34,1.05))*5.0)-0.5);
    float grid=1.0-smoothstep(0.425,0.485,max(gridDistance.x,gridDistance.y));
    float contourDistance=abs(fract((point.y+1.0)*9.0)-0.5);
    float contour=1.0-smoothstep(0.42,0.49,contourDistance);
    float animatedContourDistance=abs(fract((point.y+1.0)*5.0-uTime*0.15)-0.5);
    float animatedContour=1.0-smoothstep(0.40,0.49,animatedContourDistance);
    surfaceColor=mix(surfaceColor,vec3(0.015,0.045,0.14),clamp(grid*0.82+contour*0.42,0.0,0.92));
    color=surfaceColor*(0.38+0.62*diffuse);
    color+=fresnel*vec3(0.28,0.66,1.0)*0.34;
    float specular=pow(max(dot(reflect(-lightDirection,normal),-rayDirection),0.0),38.0);
    color+=specular*vec3(0.95,0.99,1.0)*0.72;

    // A moving acquisition plane and contour pulse make the plot feel live.
    float scanPosition=mix(-1.34,1.34,fract(uTime*0.075));
    float scanBand=exp(-abs(point.x-scanPosition)*34.0);
    color=mix(color,vec3(0.18,0.92,0.90),scanBand*0.72);
    color+=animatedContour*vec3(0.08,0.42,1.0)*0.16;

    // Contrasting sample markers sit directly on the mathematical surface.
    float markerDistance=10.0;
    markerDistance=min(markerDistance,length(point.xz-vec2(-0.72,-0.38)));
    markerDistance=min(markerDistance,length(point.xz-vec2(-0.18,0.48)));
    markerDistance=min(markerDistance,length(point.xz-vec2(0.42,-0.12)));
    markerDistance=min(markerDistance,length(point.xz-vec2(0.82,0.44)));
    float marker=exp(-markerDistance*58.0);
    color=mix(color,vec3(1.0,0.20,0.12),marker*0.92);

    float distanceFog=smoothstep(2.4,6.2,travel);
    color=mix(color,vec3(0.91,0.95,1.0),distanceFog*0.24);
  }

  return color*(1.0-0.08*length(uv-0.5));
}

void main(){
  vec2 pixel=1.0/max(uResolution,vec2(1.0));
  vec3 a=renderPlot(vUv+pixel*vec2(-0.28,0.28));
  vec3 b=renderPlot(vUv+pixel*vec2(0.28,-0.28));
  glFragColor=vec4((a+b)*0.5,1.0);
}`;

const heroCanvas = document.querySelector<HTMLCanvasElement>("#heroEffectCanvas")!;
const navCanvas = document.querySelector<HTMLCanvasElement>("#navEffectCanvas")!;
const cardCanvas = document.querySelector<HTMLCanvasElement>("#cardEffectCanvas")!;
const menuButton = document.querySelector<HTMLButtonElement>(".menu-button")!;
const nav = document.querySelector<HTMLElement>("#siteNav")!;
const siteHeader = document.querySelector<HTMLElement>(".site-header")!;
const hero = document.querySelector<HTMLElement>(".hero")!;
const signalMap = document.querySelector<HTMLElement>(".signal-map")!;
menuButton.addEventListener("click",()=>{const open=menuButton.getAttribute("aria-expanded")==="true";menuButton.setAttribute("aria-expanded",String(!open));nav.classList.toggle("open",!open);});

type PointerState={x:number;y:number;targetX:number;targetY:number;restX:number;restY:number};
const heroPointer:PointerState={x:0.68,y:0.48,targetX:0.68,targetY:0.48,restX:0.68,restY:0.48};
const navPointer:PointerState={x:0.5,y:0.5,targetX:0.5,targetY:0.5,restX:0.5,restY:0.5};
const cardPointer:PointerState={x:0.5,y:0.5,targetX:0.5,targetY:0.5,restX:0.5,restY:0.5};

function updatePointer(state:PointerState,event:PointerEvent,area:HTMLElement):void{
  const rect=area.getBoundingClientRect();
  state.targetX=(event.clientX-rect.left)/Math.max(rect.width,1);
  state.targetY=1-(event.clientY-rect.top)/Math.max(rect.height,1);
}

function resetPointer(state:PointerState):void{
  state.targetX=state.restX;
  state.targetY=state.restY;
}

siteHeader.addEventListener("pointermove",event=>updatePointer(navPointer,event,siteHeader),{passive:true});
siteHeader.addEventListener("pointerleave",()=>resetPointer(navPointer));
hero.addEventListener("pointermove",event=>updatePointer(heroPointer,event,hero),{passive:true});
hero.addEventListener("pointerleave",()=>resetPointer(heroPointer));
if(!isPlotNetwork){
  signalMap.addEventListener("pointermove",event=>{
    event.stopPropagation();
    updatePointer(cardPointer,event,signalMap);
    if(isLightNetwork){
      cardPointer.targetX=1-cardPointer.targetX;
      cardPointer.targetY=1-cardPointer.targetY;
    }
  });
  signalMap.addEventListener("pointerleave",()=>resetPointer(cardPointer));
}
const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;

const plotElevation=document.querySelector<HTMLElement>("#plotElevation");
const plotPeak=document.querySelector<HTMLElement>("#plotPeak");
const plotRange=document.querySelector<HTMLElement>("#plotRange");
const plotScan=document.querySelector<HTMLElement>("#plotScan");

function samplePlotHeight(x:number,z:number,time:number):number{
  const waves=Math.sin(x*2.8+time*0.42)*Math.cos(z*2.4-time*0.31)*0.22;
  const peakA=Math.exp(-((x+0.38)**2+(z-0.16)**2)*3.8)*0.52;
  const peakB=Math.exp(-((x-0.52)**2+(z+0.28)**2)*6.2)*0.34;
  const basin=Math.exp(-((x-0.18)**2+(z-0.48)**2)*5.0)*0.28;
  return waves+peakA+peakB-basin-0.10;
}

function updatePlotStats(time:number):void{
  if(!plotElevation||!plotPeak||!plotRange||!plotScan)return;
  let minimum=Infinity;let maximum=-Infinity;
  for(let zIndex=0;zIndex<=12;zIndex++){
    const z=-1.05+(zIndex/12)*2.10;
    for(let xIndex=0;xIndex<=16;xIndex++){
      const x=-1.34+(xIndex/16)*2.68;
      const height=samplePlotHeight(x,z,time);
      minimum=Math.min(minimum,height);maximum=Math.max(maximum,height);
    }
  }
  const cameraHeight=1.94+Math.sin(time*0.11)*0.10;
  const elevationDegrees=Math.atan2(cameraHeight+0.02,2.38)*180/Math.PI;
  plotElevation.textContent=`${elevationDegrees.toFixed(1)}°`;
  plotPeak.textContent=maximum.toFixed(2);
  plotRange.textContent=`${minimum.toFixed(2)} — ${maximum.toFixed(2)}`;
  plotScan.textContent=`${Math.floor((time*0.075%1)*100)}%`;
}

function startEffect(canvas:HTMLCanvasElement,shader:string,name:string,pointer:PointerState,antialias=false):void{
  const engine=createGLEngine(canvas,{alpha:false,antialias});
  setHardwareScalingLevel(engine,1/Math.min(devicePixelRatio||1,1.5));
  const effect=createEffectWrapper(engine,{name,fragmentSource:shader,uniformNames:["uResolution","uPointer","uTime"],samplerNames:[]});
  let time=0;let previousTime=performance.now();let previousStatsUpdate=0;
  runRenderLoop(engine,()=>{
    const now=performance.now();const delta=Math.min((now-previousTime)/1000,0.05);previousTime=now;if(!reducedMotion)time+=delta;
    if(name==="card-3d-plot"&&now-previousStatsUpdate>100){updatePlotStats(time);previousStatsUpdate=now;}
    pointer.x+=(pointer.targetX-pointer.x)*0.035;pointer.y+=(pointer.targetY-pointer.y)*0.035;resizeGLEngine(engine);if(!isEffectReady(engine,effect.effect))return;
    setViewport(engine);applyEffectWrapper(effect);setEffectFloat2(engine,effect.effect,"uResolution",canvas.width,canvas.height);setEffectFloat2(engine,effect.effect,"uPointer",pointer.x,pointer.y);setEffectFloat(engine,effect.effect,"uTime",time);drawEffect(engine);
  });
}

startEffect(heroCanvas,flowShader,"dual-hero-flow",heroPointer);
startEffect(navCanvas,prismShader,"dual-nav-prism",navPointer);
const cardShader=isPlotNetwork?networkPlotShader:isLightNetwork?networkLightShader:networkShader;
const cardEffectName=isPlotNetwork?"card-3d-plot":isLightNetwork?"card-kinetic-lattice":"card-network-field";
startEffect(cardCanvas,cardShader,cardEffectName,cardPointer,true);
