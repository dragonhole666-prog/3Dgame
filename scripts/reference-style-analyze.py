from __future__ import annotations
import argparse, json
from pathlib import Path
import numpy as np
from PIL import Image

# Deterministic reference-image look-dev tool used by HF26. It measures the
# supplied image; it does not invent a palette from a prompt.

def luminance(rgb: np.ndarray) -> np.ndarray:
    rgb=rgb.astype(np.float32)/255.0
    return rgb[...,0]*.2126+rgb[...,1]*.7152+rgb[...,2]*.0722

def palette(img: Image.Image, colors: int=14):
    small=img.convert('RGB').resize((320,220),Image.Resampling.LANCZOS)
    q=small.quantize(colors=colors,method=Image.Quantize.MEDIANCUT)
    raw=q.getpalette()[:colors*3]
    counts=np.bincount(np.asarray(q).ravel(),minlength=colors)
    total=max(1,int(counts.sum()))
    rows=[]
    for idx in np.argsort(counts)[::-1]:
        if counts[idx]<=0: continue
        r,g,b=raw[idx*3:idx*3+3]
        rows.append({'hex':f'#{r:02X}{g:02X}{b:02X}','share':round(float(counts[idx]/total),6)})
    return rows

def main():
    ap=argparse.ArgumentParser(description='Measure a reference frame and emit Qinglan color profile JSON.')
    ap.add_argument('input')
    ap.add_argument('--output',default='public/assets/reference-20260925/reference-style-profile.json')
    ap.add_argument('--crop',nargs=4,type=int,metavar=('L','T','R','B'))
    ns=ap.parse_args()
    img=Image.open(ns.input).convert('RGB')
    if ns.crop: img=img.crop(tuple(ns.crop))
    y=luminance(np.asarray(img))
    profile={
      'source':Path(ns.input).name,
      'crop':ns.crop,
      'palette':palette(img),
      'luminance':{
        'p05':round(float(np.quantile(y,.05)),4),'p25':round(float(np.quantile(y,.25)),4),
        'median':round(float(np.quantile(y,.50)),4),'p75':round(float(np.quantile(y,.75)),4),
        'p90':round(float(np.quantile(y,.90)),4),'p97':round(float(np.quantile(y,.97)),4),
        'deepShadowShare':round(float((y<.16).mean()),4),'highlightShare':round(float((y>.80).mean()),4),
      }
    }
    out=Path(ns.output); out.parent.mkdir(parents=True,exist_ok=True); out.write_text(json.dumps(profile,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(profile,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
