import {describe,expect,it} from 'vitest';
import * as T from 'three';
import {canonicalBoneName} from '../src/client/character/bone-names';
import {curatedEquipmentDefinition,curatedSkinTarget,remapSkinPreserveAuthored} from '../src/client/character/curated-equipment';

describe('HF10 garment visibility and bilateral bone mapping',()=>{
 it('never mistakes Right* humanoid bones for a Rig prefix',()=>{
  expect(canonicalBoneName('RightUpperArm')).toBe('RightUpperArm');
  expect(canonicalBoneName('RightForearm')).toBe('RightForearm');
  expect(canonicalBoneName('RightHand')).toBe('RightHand');
  expect(canonicalBoneName('RightThigh')).toBe('RightThigh');
  expect(canonicalBoneName('RightShin')).toBe('RightShin');
  expect(canonicalBoneName('RightFoot')).toBe('RightFoot');
  expect(canonicalBoneName('RigRightUpperArm')).toBe('RightUpperArm');
 });
 it('keeps a curated skin target surface finite',()=>{
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-.2,0,0,.2,0,0,0,1.8,0],3));g.setAttribute('normal',new T.Float32BufferAttribute([0,0,1,0,0,1,0,0,1],3));
  const bone=new T.Bone();bone.name='Hips';const mesh=new T.SkinnedMesh(g,new T.MeshStandardMaterial());mesh.add(bone);mesh.bind(new T.Skeleton([bone]));const root=new T.Group();root.add(mesh);root.updateMatrixWorld(true);const target=curatedSkinTarget(mesh,root);
  expect(target.surface).toBeDefined();expect(target.surface!.bounds.isEmpty()).toBe(false);
 });
 it('keeps the HF14 compatibility rebind available as a safe fallback',()=>{
  const sourceRoot=new T.Group(),sourceBone=new T.Bone();sourceBone.name='Hips';sourceBone.position.x=1;sourceRoot.add(sourceBone);sourceRoot.updateMatrixWorld(true);const sourceSkeleton=new T.Skeleton([sourceBone]);sourceSkeleton.calculateInverses();
  const sourceGeometry=new T.BufferGeometry();sourceGeometry.setAttribute('position',new T.Float32BufferAttribute([1.2,0,0,1.2,.1,0,1.2,0,.1],3));sourceGeometry.setAttribute('skinIndex',new T.Uint16BufferAttribute([0,0,0,0,0,0,0,0,0,0,0,0],4));sourceGeometry.setAttribute('skinWeight',new T.Float32BufferAttribute([1,0,0,0,1,0,0,0,1,0,0,0],4));const source=new T.SkinnedMesh(sourceGeometry,new T.MeshBasicMaterial());sourceRoot.add(source);source.bind(sourceSkeleton,new T.Matrix4());
  const targetRoot=new T.Group(),targetBone=new T.Bone();targetBone.name='Hips';targetBone.position.x=2;targetRoot.add(targetBone);targetRoot.updateMatrixWorld(true);const targetSkeleton=new T.Skeleton([targetBone]);targetSkeleton.calculateInverses();const targetGeometry=sourceGeometry.clone();const targetMesh=new T.SkinnedMesh(targetGeometry,new T.MeshBasicMaterial());targetRoot.add(targetMesh);targetMesh.bind(targetSkeleton,new T.Matrix4());targetRoot.updateMatrixWorld(true);
  const rebound=remapSkinPreserveAuthored(source,curatedSkinTarget(targetMesh,targetRoot))!,position=rebound.geometry.getAttribute('position') as T.BufferAttribute;
  expect(position.getX(0)).toBeCloseTo(1.2,5);expect(rebound.userData.bindPoseTransferred).toBe(false);expect(rebound.skeleton).toBe(targetSkeleton);
  expect(curatedEquipmentDefinition('cloud-robe')?.fitStrategy).toBe('anatomical-transfer');
 });
 it('corrects the user-supplied primordial crown front/back orientation at the data layer',()=>{
  const crown=curatedEquipmentDefinition('primordial-god-crown');expect(crown?.localRotation?.[1]).toBeCloseTo(Math.PI,6);
 });
});
