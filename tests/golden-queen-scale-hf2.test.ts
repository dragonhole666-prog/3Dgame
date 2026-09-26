import * as T from 'three';
import {describe,expect,it} from 'vitest';
import {measureHumanoidSkeletonFrame,monsterVisualHeight} from '../src/client/character/monster-model';
import {MONSTERS} from '../src/shared/data/monsters';

describe('P0.26.8 HF2 Golden Queen humanoid scale guard',()=>{
 it('keeps the Queen at 2.2 player heights and clamps authored boss ratios to 2x-3x',()=>{
  const queen=MONSTERS['golden-queen'];
  expect(queen.visualHeightRatio).toBe(2.20);
  expect(monsterVisualHeight(queen)).toBeCloseTo(1.92*2.20,6);
  expect(monsterVisualHeight({...queen,visualHeightRatio:1})).toBeCloseTo(1.92*2,6);
  expect(monsterVisualHeight({...queen,visualHeightRatio:10})).toBeCloseTo(1.92*3,6);
 });
 it('measures humanoid height from feet to head instead of oversized mesh/decor bounds',()=>{
  const root=new T.Group();
  const add=(name:string,x:number,y:number,z:number)=>{const o=new T.Object3D();o.name=name;o.position.set(x,y,z);root.add(o);return o;};
  add('mixamorig:Hips',0,1.04,0);add('mixamorig:HeadTop_End',0,1.76,0);add('mixamorig:LeftToeBase',-.10,0,.06);add('mixamorig:RightToeBase',.10,0,.06);
  const decoration=new T.Mesh(new T.BoxGeometry(20,20,20),new T.MeshBasicMaterial());decoration.position.y=7;root.add(decoration);
  const frame=measureHumanoidSkeletonFrame(root);expect(frame).toBeDefined();expect(frame!.height).toBeCloseTo(1.76,6);expect(frame!.groundY).toBeCloseTo(0,6);
 });
});
