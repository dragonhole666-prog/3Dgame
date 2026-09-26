import * as T from 'three';

export type WideGamutBootResult={
  canvas:HTMLCanvasElement;
  context:WebGLRenderingContext|WebGL2RenderingContext;
  usingDisplayP3:boolean;
  usingWebGL2:boolean;
};

/**
 * Best-effort Display-P3 / Wide-Gamut WebGL boot.
 *
 * Three.js still shades in the usual linear/sRGB pipeline, but modern Chromium
 * builds can present the drawing buffer in Display-P3. We request that surface
 * up front and mark the document so UI CSS can switch to P3 values too.
 */
export function createWideGamutRendererSurface():WideGamutBootResult{
  const canvas=document.createElement('canvas');
  const base={antialias:false,powerPreference:'high-performance',stencil:false,alpha:false,desynchronized:true,premultipliedAlpha:false,preserveDrawingBuffer:false} as const;
  const p3Attrs={...base,colorSpace:'display-p3'} as WebGLContextAttributes&{colorSpace?:string};
  const fallbackAttrs={...base} as WebGLContextAttributes;
  let context=(canvas.getContext('webgl2',p3Attrs) as WebGL2RenderingContext|null)
    ?? (canvas.getContext('webgl',p3Attrs) as WebGLRenderingContext|null)
    ?? (canvas.getContext('experimental-webgl',p3Attrs) as WebGLRenderingContext|null)
    ?? (canvas.getContext('webgl2',fallbackAttrs) as WebGL2RenderingContext|null)
    ?? (canvas.getContext('webgl',fallbackAttrs) as WebGLRenderingContext|null)
    ?? (canvas.getContext('experimental-webgl',fallbackAttrs) as WebGLRenderingContext|null);
  if(!context)throw new Error('無法建立 WebGL 繪圖內容。');

  const ctxAny=context as WebGLRenderingContext&{drawingBufferColorSpace?:string;unpackColorSpace?:string};
  let usingDisplayP3=false;
  try{if('drawingBufferColorSpace' in ctxAny){ctxAny.drawingBufferColorSpace='display-p3';usingDisplayP3=ctxAny.drawingBufferColorSpace==='display-p3';}}catch{}
  try{if('unpackColorSpace' in ctxAny)ctxAny.unpackColorSpace='display-p3';}catch{}
  try{usingDisplayP3 ||= window.matchMedia?.('(color-gamut: p3)').matches??false;}catch{}

  document.documentElement.classList.toggle('wide-gamut',usingDisplayP3);
  document.documentElement.dataset.colorGamut=usingDisplayP3?'display-p3':'srgb';
  return {canvas,context,usingDisplayP3,usingWebGL2:context instanceof WebGL2RenderingContext};
}

export function setWideGamutTextureHints(renderer:T.WebGLRenderer){
  const target=(renderer.getContext() as WebGLRenderingContext&{drawingBufferColorSpace?:string;unpackColorSpace?:string});
  try{if('drawingBufferColorSpace' in target&&document.documentElement.dataset.colorGamut==='display-p3')target.drawingBufferColorSpace='display-p3';}catch{}
  try{if('unpackColorSpace' in target&&document.documentElement.dataset.colorGamut==='display-p3')target.unpackColorSpace='display-p3';}catch{}
}
