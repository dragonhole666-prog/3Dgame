import { describe,expect,it } from 'vitest';
import * as T from 'three';
import { XIANXIA_GRADIENTS,applyXianxiaWorldArtDirection,harmonizeXianxiaSurfaceColor,standardizeXianxiaMaterial } from '../src/client/rendering/xianxia-visual-style';

describe('HF18 commercial xianxia visual style',()=>{
 it('defines warm foliage, cool water and muted jade families instead of RGB debug primaries',()=>{
  expect(XIANXIA_GRADIENTS.maple.length).toBeGreaterThanOrEqual(5);
  expect(XIANXIA_GRADIENTS.water.length).toBeGreaterThanOrEqual(5);
  expect(XIANXIA_GRADIENTS.jade.length).toBeGreaterThanOrEqual(5);
  const green=harmonizeXianxiaSurfaceColor('#00ff00'),hsl={h:0,s:0,l:0};green.getHSL(hsl);
  expect(hsl.s).toBeLessThan(.6);
  expect(green.getHexString()).not.toBe('00ff00');
 });
 it('converts visible mesh surfaces to MeshStandardMaterial and applies semantic PBR values',()=>{
  const basic=new T.MeshBasicMaterial({color:'#d06a52'});basic.name='metal_blade';
  const material=standardizeXianxiaMaterial(basic,'metal');
  expect(material).toBeInstanceOf(T.MeshStandardMaterial);
  expect(material.metalness).toBeGreaterThan(.6);
  expect(material.roughness).toBeGreaterThan(.2);
  expect(material.roughness).toBeLessThan(.4);
 });
 it('separates uploaded terrain into ground/water/stone PBR material groups',()=>{
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute([
   0,0,0, 1,0,0, 0,0,1,
   2,0,0, 3,0,0, 2,0,1,
   4,1,0, 5,1,0, 4,1,1,
  ],3));
  const colors=[
   40,90,62, 40,90,62, 40,90,62,
   70,150,145, 70,150,145, 70,150,145,
   126,122,117, 126,122,117, 126,122,117,
  ].map(v=>v/255);
  geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex([0,1,2,3,4,5,6,7,8]);
  const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial());mesh.name='Terrain';
  applyXianxiaWorldArtDirection(mesh);
  const materials=(mesh as T.Mesh<T.BufferGeometry,T.Material|T.Material[]>).material;
  expect(Array.isArray(materials)).toBe(true);
  if(!Array.isArray(materials))throw new Error('HF18 terrain art direction must assign three material groups');
  const mats=materials;
  expect(mats).toHaveLength(3);
  expect(mats.every(m=>m instanceof T.MeshStandardMaterial)).toBe(true);
  expect(mesh.geometry.groups.map(g=>g.materialIndex)).toEqual([0,1,2]);
 });
});
