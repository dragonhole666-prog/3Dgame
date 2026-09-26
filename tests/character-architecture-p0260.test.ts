import { describe,expect,it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CHARACTER_RUNTIME_ARCHITECTURE,humanoidAnimationAsset } from '../src/client/character/character-runtime-architecture';

const root=path.resolve(process.cwd());
const read=(p:string)=>fs.readFileSync(path.join(root,p),'utf8');

describe('P0.26 Character Architecture 2.0',()=>{
  it('declares VRM avatar + GLB equipment + TypeScript composition authority',()=>{
    expect(CHARACTER_RUNTIME_ARCHITECTURE.avatarAuthority).toBe('vrm');
    expect(CHARACTER_RUNTIME_ARCHITECTURE.equipmentAuthority).toBe('glb');
    expect(CHARACTER_RUNTIME_ARCHITECTURE.runtimeAuthority).toBe('typescript');
    const character=read('src/client/character/character.ts');
    expect(character).toContain('CharacterCompositionRuntime');
    expect(read('src/client/character/character-composition-runtime.ts')).toContain('private readonly avatar:VrmCharacterRuntime');
  });

  it('supports VRMA and GLB animation assets through one manifest',()=>{
    expect(humanoidAnimationAsset('Walk').kind).toBe('glb-mixamo');
    expect(humanoidAnimationAsset('Run').kind).toBe('glb-mixamo');
    expect(humanoidAnimationAsset('Attack1').kind).toBe('vrma');
    const runtime=read('src/client/character/vrm-character-runtime.ts');
    expect(runtime).toContain('humanoidAnimationAsset(name)');
    expect(runtime).toContain("asset.kind==='glb-mixamo'");
    expect(runtime).toContain('createQinglanVRMAnimationClip');
  });

  it('turns the creator sliders into a live VRM morph/sculpt pipeline',()=>{
    const runtime=read('src/client/character/vrm-character-runtime.ts');
    const morph=read('src/client/character/character-morph-runtime.ts');
    expect(runtime).toContain('new CharacterMorphRuntime');
    expect(runtime).toContain('this.morphRuntime?.setProfile');
    expect(runtime).not.toContain('setCustomization(_p:CharacterCustomization){}');
    expect(morph).toContain('private applyBody');
    expect(morph).toContain('private applyFace');
    expect(morph).toContain('Per-avatar geometry');
    expect(morph).toContain("delta(p,'noseForward')");
    expect(morph).toContain("delta(p,'mouthWidth')");
  });

  it('keeps VRM expressions independent from combat/locomotion animation',()=>{
    const expression=read('src/client/character/character-expression-runtime.ts');
    expect(expression).toContain("manager.setValue?.('blink'");
    expect(expression).toContain("manager.setValue?.('angry'");
    expect(expression).toContain("manager.setValue?.('sorrow'");
  });

  it('keeps GLB equipment on the established curated-equipment path',()=>{
    const runtime=read('src/client/character/vrm-character-runtime.ts');
    expect(runtime).toContain('instantiateCuratedEquipment');
    expect(runtime).toContain("instance.definition.mode!=='rigid'");
    expect(runtime).toContain('equipmentSkinTarget()');
  });
});
