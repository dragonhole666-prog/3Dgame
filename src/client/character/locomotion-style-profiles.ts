export type LocomotionStyleId='heroic-grounded';
export type LocomotionKind='walk'|'run';

export interface MixamoBoneMotionFilter{
  yawScale:number;
  rollScale:number;
  amplitudeScale?:number;
}
export interface LocomotionStyleProfile{
  id:LocomotionStyleId;
  label:string;
  referenceSources:readonly {name:string;url:string;license:string;use:string}[];
  walk:Readonly<Record<string,MixamoBoneMotionFilter>>;
  run:Readonly<Record<string,MixamoBoneMotionFilter>>;
}

/**
 * P0.26.4 grounded action-RPG gait filter.
 *
 * The source Walking/Fast_Run GLBs remain authoritative for feet, knees, cadence and arm timing.
 * Only torso/pelvis rotational DELTAS are filtered before VRM retargeting.  This removes excessive
 * lateral hip roll / torso wiggle without synthesizing a new gait or changing contact timing.
 *
 * References are documentation only; no third-party asset is downloaded at runtime or redistributed.
 */
export const HEROIC_GROUNDED_LOCOMOTION:LocomotionStyleProfile={
  id:'heroic-grounded',label:'Grounded action-RPG',
  referenceSources:[
    {name:'Quaternius Universal Animation Library',url:'https://quaternius.com/packs/universalanimationlibrary.html',license:'reference-only in this package; verify current publisher terms before redistributing source assets',use:'GLB humanoid locomotion, jog and sprint silhouette reference'},
  ],
  walk:{
    'mixamorig:Hips':{yawScale:.62,rollScale:.44},
    'mixamorig:Spine':{yawScale:.78,rollScale:.66},
    'mixamorig:Spine1':{yawScale:.82,rollScale:.70},
    'mixamorig:Spine2':{yawScale:.86,rollScale:.74},
  },
  run:{
    'mixamorig:Hips':{yawScale:.72,rollScale:.56},
    'mixamorig:Spine':{yawScale:.82,rollScale:.72},
    'mixamorig:Spine1':{yawScale:.88,rollScale:.78},
    'mixamorig:Spine2':{yawScale:.90,rollScale:.80},
  },
};

export function locomotionStyleFilters(kind:LocomotionKind){return HEROIC_GROUNDED_LOCOMOTION[kind];}
