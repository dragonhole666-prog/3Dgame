from __future__ import annotations
import argparse
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter


def normalize(v: np.ndarray, axis=-1, eps=1e-6):
    n=np.linalg.norm(v,axis=axis,keepdims=True)
    return v/np.maximum(n,eps)

def maps_for(albedo_path: Path):
    img=Image.open(albedo_path).convert('RGB')
    arr=np.asarray(img,dtype=np.float32)/255.0
    linear=np.power(arr,2.2)
    gray=linear[...,0]*0.2126+linear[...,1]*0.7152+linear[...,2]*0.0722
    # Suppress AI-baked contrast before deriving geometric detail.
    base=np.asarray(Image.fromarray(np.clip(gray*255,0,255).astype('uint8')).filter(ImageFilter.GaussianBlur(6)),dtype=np.float32)/255.0
    detail=np.clip(gray-base+0.5,0,1)
    gy,gx=np.gradient(detail)
    strength=3.2
    normal=np.dstack((-gx*strength,-gy*strength,np.ones_like(gray)))
    normal=normalize(normal)
    normal=(normal*0.5+0.5)*255.0
    # More detailed / dark recesses are rougher, brighter polished variation slightly smoother.
    rough=np.clip(0.72+(0.5-detail)*0.30+(0.52-gray)*0.16,0.38,0.96)
    stem=albedo_path.name.replace('_albedo.png','')
    Image.fromarray(normal.astype('uint8'),'RGB').save(albedo_path.with_name(f'{stem}_normal.png'))
    Image.fromarray((rough*255).astype('uint8'),'L').save(albedo_path.with_name(f'{stem}_roughness.png'))
    print(f'PBR maps: {stem}')

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--dir',default='public/assets/ai-cinematic')
    ns=ap.parse_args()
    root=Path(ns.dir)
    for name in ('grass_albedo.png','stone_albedo.png','wood_albedo.png','roof_albedo.png'):
        path=root/name
        if not path.exists(): raise SystemExit(f'missing {path}')
        maps_for(path)

if __name__=='__main__': main()
