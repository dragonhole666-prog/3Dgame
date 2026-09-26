/** Canonical humanoid bone names used by curated skinned-equipment remapping. */
export function canonicalBoneName(name:string):string|undefined{
 const raw=name.toLowerCase().replace(/[^a-z0-9]/g,'');
 // HF10: do not strip the first three letters from ordinary Right* bones.
 // `rightHand` starts with the characters `rig`, so the old /^(...|rig)/ rule turned it into `hthand`
 // and made the complete right side fall back to Hips during garment skin remapping.
 let n=raw.replace(/^(?:mixamorig|armature)/,'');
 if(n.startsWith('rig')&&!n.startsWith('right'))n=n.slice(3);
 const exact:Record<string,string>={
  root:'Root',hips:'Hips',pelvis:'Hips',spine:'Spine',spine01:'Spine',spine1:'Spine',spine02:'Chest',spine2:'Chest',spine03:'Chest',spine3:'Chest',chest:'Chest',
  neck:'Neck',neck01:'Neck',head:'Head',
  leftshoulder:'LeftShoulder',shoulderl:'LeftShoulder',leftclavicle:'LeftShoulder',claviclel:'LeftShoulder',rightshoulder:'RightShoulder',shoulderr:'RightShoulder',rightclavicle:'RightShoulder',clavicler:'RightShoulder',
  leftupperarm:'LeftUpperArm',upperarml:'LeftUpperArm',upperarmleft:'LeftUpperArm',leftarm:'LeftUpperArm',rightupperarm:'RightUpperArm',upperarmr:'RightUpperArm',upperarmright:'RightUpperArm',rightarm:'RightUpperArm',
  leftforearm:'LeftForearm',leftlowerarm:'LeftForearm',lowerarml:'LeftForearm',forearml:'LeftForearm',rightforearm:'RightForearm',rightlowerarm:'RightForearm',lowerarmr:'RightForearm',forearmr:'RightForearm',
  lefthand:'LeftHand',handl:'LeftHand',righthand:'RightHand',handr:'RightHand',
  leftthigh:'LeftThigh',thighl:'LeftThigh',leftupleg:'LeftThigh',rightthigh:'RightThigh',thighr:'RightThigh',rightupleg:'RightThigh',
  leftshin:'LeftShin',calfl:'LeftShin',leftleg:'LeftShin',leftlowerleg:'LeftShin',rightshin:'RightShin',calfr:'RightShin',rightleg:'RightShin',rightlowerleg:'RightShin',
  leftfoot:'LeftFoot',footl:'LeftFoot',rightfoot:'RightFoot',footr:'RightFoot',lefttoebase:'LeftToe',lefttoe:'LeftToe',balll:'LeftToe',righttoebase:'RightToe',righttoe:'RightToe',ballr:'RightToe',
  jbipchips:'Hips',jbipcspine:'Spine',jbipcchest:'Chest',jbipcupperchest:'Chest',jbipcneck:'Neck',jbipchead:'Head',jbiplshoulder:'LeftShoulder',jbiprshoulder:'RightShoulder',
  jbiplupperarm:'LeftUpperArm',jbipllowerarm:'LeftForearm',jbiplhand:'LeftHand',jbiprupperarm:'RightUpperArm',jbiprlowerarm:'RightForearm',jbiprhand:'RightHand',
  jbiplupperleg:'LeftThigh',jbipllowerleg:'LeftShin',jbiplfoot:'LeftFoot',jbipltoes:'LeftToe',jbiprupperleg:'RightThigh',jbiprlowerleg:'RightShin',jbiprfoot:'RightFoot',jbiprtoes:'RightToe'
 };
 if(exact[n])return exact[n];
 const left=/(?:left|_l$|l$)/i.test(name),right=/(?:right|_r$|r$)/i.test(name),side=left?'Left':right?'Right':'';
 if(side&&/(clavicle|shoulder)/.test(n))return `${side}Shoulder`;
 if(side&&/(upperarm|armtwist|uparm)/.test(n))return `${side}UpperArm`;
 if(side&&/(lowerarm|forearm)/.test(n))return `${side}Forearm`;
 if(side&&/(?:^|left|right)(?:hand)$/.test(n))return `${side}Hand`;
 if(side&&/(thigh|upleg)/.test(n))return `${side}Thigh`;
 if(side&&/(calf|shin|lowerleg)/.test(n))return `${side}Shin`;
 if(side&&/(toe|ball)/.test(n))return `${side}Toe`;
 if(side&&/foot/.test(n))return `${side}Foot`;
 if(/thumb|index|middle|ring|pinky|finger/.test(n))return undefined;
 if(/jaw|eye|ear|face/.test(n))return 'Head';
 if(/neck/.test(n))return 'Neck';
 if(/spine0?[23-9]|chest/.test(n))return 'Chest';
 if(/spine/.test(n))return 'Spine';
 return undefined;
}
