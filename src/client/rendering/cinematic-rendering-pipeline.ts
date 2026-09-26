import * as T from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export type CinematicGradeLevel='off'|'light'|'cinematic';

const CINEMATIC_VERTEX=`
varying vec2 vUv;
void main(){
  vUv=uv;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;

/*
 * HF23 ReferenceMatched grade.
 * Target measured from the supplied reference image:
 * - luminance median ~0.33 (old game capture ~0.72)
 * - 10.31% of pixels in deep shadow (<0.16), 6.21% above 0.8
 * - dominant dark teal / blue-grey + warm maple / peach highlights
 *
 * This pass intentionally creates density and hue separation BEFORE OutputPass.
 * It is not a generic saturation filter.
 */
const CINEMATIC_FRAGMENT=`
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
uniform float uStrength;
uniform float uSharpen;
uniform float uGrain;
uniform float uVignette;
uniform float uTime;
uniform float uDensity;
uniform float uChroma;
uniform float uCoral;
uniform float uTeal;
uniform float uGreenSuppress;
varying vec2 vUv;

float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}

vec3 linearToOklab(vec3 c){
  c=max(c,vec3(0.0));
  float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b;
  float m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b;
  float s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b;
  vec3 q=pow(max(vec3(l,m,s),vec3(0.0)),vec3(1.0/3.0));
  return vec3(
    .2104542553*q.x+.7936177850*q.y-.0040720468*q.z,
    1.9779984951*q.x-2.4285922050*q.y+.4505937099*q.z,
    .0259040371*q.x+.7827717662*q.y-.8086757660*q.z
  );
}

vec3 oklabToLinear(vec3 lab){
  float l_=lab.x+.3963377774*lab.y+.2158037573*lab.z;
  float m_=lab.x-.1055613458*lab.y-.0638541728*lab.z;
  float s_=lab.x-.0894841775*lab.y-1.2914855480*lab.z;
  float l=l_*l_*l_,m=m_*m_*m_,s=s_*s_*s_;
  return vec3(
    4.0767416621*l-3.3077115913*m+.2309699292*s,
    -1.2684380046*l+2.6097574011*m-.3413193965*s,
    -.0041960863*l-.7034186147*m+1.7076147010*s
  );
}

/*
 * HF26.1 screenshot-calibrated creative transform.
 * Calibration source: the user's actual in-game capture vs supplied reference.
 * The old pass was too neutral: ~44% low-saturation pixels versus ~21% in the
 * reference, while bright highlight occupancy was ~3% versus ~9.6%.
 *
 * This curve leaves ACES as the sole tone mapper. It only reshapes creative
 * luminance/chroma before OutputPass, avoiding the previous "pre-tone-map then
 * ACES again" muddy look.
 */
float referenceL(float L){
  float deep=(1.0-smoothstep(.23,.50,L))*.026;
  float upperMid=smoothstep(.53,.73,L)*(1.0-smoothstep(.80,.93,L))*.082;
  float highlight=smoothstep(.80,.97,L)*.055;
  return clamp(L-deep-upperMid+highlight,0.0,1.22);
}

vec3 calibratedReferenceGrade(vec3 c,float amount){
  vec3 lab=linearToOklab(c);
  float a=lab.y,b=lab.z;

  // 2x2 Oklab chroma covariance match measured from the two screenshots.
  float ta=1.42*a-.16*b+.003;
  float tb=-.08*a+1.36*b-.004;

  vec2 mapped=mix(vec2(a,b),vec2(ta,tb),clamp(uChroma*amount,0.0,1.0));

  // Gamut-safe saturation: keep strong color separation without neon clipping.
  float maxC=mix(.10,.20,smoothstep(.15,.82,lab.x));
  float C=length(mapped);
  if(C>maxC)mapped*=maxC/max(C,1e-5);

  lab.x=mix(lab.x,referenceL(lab.x),clamp(uDensity*amount,0.0,1.0));
  lab.yz=mapped;
  return max(oklabToLinear(lab),vec3(0.0));
}

vec3 semanticHueSeparation(vec3 c,float amount){
  float y=luma(c);

  // Warm red/orange family: reference maple/wood highlights.
  float warmMask=smoothstep(.015,.22,c.r-c.b)*smoothstep(.012,.17,c.r-c.g)*smoothstep(.045,.70,y);
  c*=mix(vec3(1.0),vec3(1.10,1.015,.91),warmMask*.26*uCoral*amount);
  c+=vec3(.026,.006,-.010)*warmMask*uCoral*amount;

  // Cyan/blue family: sky, haze and water.
  float cyanMask=smoothstep(.012,.20,c.b-c.r)*smoothstep(-.035,.15,c.g-c.r)*smoothstep(.035,.82,y);
  c*=mix(vec3(1.0),vec3(.88,1.035,1.115),cyanMask*.28*uTeal*amount);
  c+=vec3(-.009,.013,.026)*cyanMask*uTeal*amount;

  // Neutral brown/grey mids are the main source of the cheap muddy cast.
  // Nudge them toward cool slate instead of merely adding saturation.
  float spread=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));
  float neutralMid=(1.0-smoothstep(.045,.18,spread))*smoothstep(.08,.62,y);
  c*=mix(vec3(1.0),vec3(.93,1.005,1.055),neutralMid*.18*amount);

  return max(c,vec3(0.0));
}


vec3 suppressMuddyGreen(vec3 c,float amount){
  float y=luma(c);
  float greenMask=smoothstep(.02,.24,c.g-c.r)*smoothstep(-.05,.18,c.g-c.b)*smoothstep(.05,.72,y);
  vec3 target=vec3((c.r+c.b)*.5,c.g*.95,c.b*1.06);
  c=mix(c,target,greenMask*.42*uGreenSuppress*amount);
  c+=vec3(.006,-.004,.012)*greenMask*uGreenSuppress*amount;
  return max(c,vec3(0.0));
}

void main(){
  vec3 center=texture2D(tDiffuse,vUv).rgb;
  vec3 n=texture2D(tDiffuse,vUv+vec2(0.0,uTexel.y)).rgb;
  vec3 s=texture2D(tDiffuse,vUv-vec2(0.0,uTexel.y)).rgb;
  vec3 e=texture2D(tDiffuse,vUv+vec2(uTexel.x,0.0)).rgb;
  vec3 w=texture2D(tDiffuse,vUv-vec2(uTexel.x,0.0)).rgb;
  vec3 ne=texture2D(tDiffuse,vUv+uTexel).rgb;
  vec3 sw=texture2D(tDiffuse,vUv-uTexel).rgb;
  vec3 blur=(n+s+e+w+ne+sw)*.1666667;

  // Sharpen is deliberately restrained. Oversharpening was creating hard,
  // plastic edges instead of the reference's dense photographic microcontrast.
  vec3 c=max(vec3(0.0),center+(center-blur)*uSharpen);

  c=calibratedReferenceGrade(c,uStrength);
  c=semanticHueSeparation(c,uStrength);
  c=suppressMuddyGreen(c,uStrength);

  // Small highlight separation, not a global white haze.
  float yy=luma(c);
  float halo=smoothstep(.72,1.12,luma(blur));
  c+=vec3(.016,.013,.010)*halo*uStrength;
  c+=vec3(.008,.012,.021)*smoothstep(.26,.82,yy)*uStrength*.34;
  c+=vec3(.012,.010,.006)*smoothstep(.62,1.05,yy)*uStrength;

  vec2 q=vUv-.5;
  float edge=dot(q,q);
  float vign=1.0-edge*uVignette;
  c*=mix(1.0,clamp(vign,.80,1.0),uStrength);

  float grain=(hash(vUv*vec2(2387.0,1351.0)+uTime*17.3)-.5)*uGrain;
  c+=grain*(.72-.36*smoothstep(.55,1.0,yy));

  gl_FragColor=vec4(max(c,vec3(0.0)),1.0);
}`;

export function createCinematicGradePass(){
  return new ShaderPass({
    uniforms:{
      tDiffuse:{value:null},
      uTexel:{value:new T.Vector2(1/1920,1/1080)},
      uStrength:{value:1.0},
      uSharpen:{value:.025},
      uGrain:{value:.0018},
      uVignette:{value:.035},
      uTime:{value:0},
      uDensity:{value:1.00},
      uChroma:{value:.94},
      uCoral:{value:1.03},
      uTeal:{value:1.04},
      uGreenSuppress:{value:.58},
    },
    vertexShader:CINEMATIC_VERTEX,
    fragmentShader:CINEMATIC_FRAGMENT,
  });
}

export function configureCinematicGrade(pass:ShaderPass,level:CinematicGradeLevel,width:number,height:number){
  const uniforms=pass.uniforms as Record<string,{value:any}>;
  uniforms.uTexel.value.set(1/Math.max(1,width),1/Math.max(1,height));
  pass.enabled=level!=='off';
  if(level==='cinematic'){
    uniforms.uStrength.value=1.0;
    uniforms.uSharpen.value=.025;
    uniforms.uGrain.value=.0018;
    uniforms.uVignette.value=.035;
    uniforms.uDensity.value=1.00;
    uniforms.uChroma.value=.94;
    uniforms.uCoral.value=1.03;
    uniforms.uTeal.value=1.04;
    uniforms.uGreenSuppress.value=.58;
  }else if(level==='light'){
    uniforms.uStrength.value=.82;
    uniforms.uSharpen.value=.015;
    uniforms.uGrain.value=.0012;
    uniforms.uVignette.value=.025;
    uniforms.uDensity.value=.82;
    uniforms.uChroma.value=.82;
    uniforms.uCoral.value=.90;
    uniforms.uTeal.value=.92;
    uniforms.uGreenSuppress.value=.46;
  }else{
    uniforms.uStrength.value=0;
    uniforms.uSharpen.value=0;
    uniforms.uGrain.value=0;
    uniforms.uVignette.value=0;
    uniforms.uDensity.value=0;
    uniforms.uChroma.value=0;
    uniforms.uCoral.value=0;
    uniforms.uTeal.value=0;
    uniforms.uGreenSuppress.value=0;
  }
}

export function updateCinematicGrade(pass:ShaderPass,time:number){
  const uniforms=pass.uniforms as Record<string,{value:any}>;
  uniforms.uTime.value=time;
}
