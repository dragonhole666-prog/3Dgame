import type { Slot } from '../../shared/types';

/**
 * HF8 single source of truth for every body-worn fit rule.
 * New GLB modules inherit these rules automatically; callers must not invent per-item fit behavior.
 */
export const BODY_FIT_SLOTS = new Set<Slot>(['shoulders','chest','wrists','hands','waist','legs','feet','cape','fashion']);

export const GARMENT_MORPHS_BY_SLOT:Readonly<Partial<Record<Slot,readonly string[]>>>={
  shoulders:['BodyMass','BodyMuscle','ShoulderWidth','UpperArmThickness'],
  chest:['BodyMass','BodyMuscle','ShoulderWidth','ChestWidth','ChestDepth','WaistWidth','WaistDepth','UpperArmThickness'],
  fashion:['BodyMass','BodyMuscle','ShoulderWidth','ChestWidth','ChestDepth','WaistWidth','WaistDepth','HipWidth','HipDepth','UpperArmThickness','ThighThickness'],
  wrists:['BodyMass','BodyMuscle','ForearmThickness'],
  hands:['BodyMass','BodyMuscle','ForearmThickness'],
  waist:['BodyMass','BodyMuscle','WaistWidth','WaistDepth','HipWidth','HipDepth'],
  legs:['BodyMass','BodyMuscle','WaistWidth','HipWidth','HipDepth','ThighThickness','CalfThickness'],
  feet:['BodyMass','BodyMuscle','CalfThickness'],
  cape:['BodyMass','BodyMuscle','ShoulderWidth','ChestWidth','ChestDepth','WaistWidth','HipWidth'],
};

/** Candidate avatar bones for automatic rigid->skinned conversion. */
export const AUTO_RIG_BONES_BY_SLOT:Readonly<Partial<Record<Slot,readonly string[]>>>={
  shoulders:['Chest','LeftShoulder','RightShoulder','LeftUpperArm','RightUpperArm'],
  chest:['Hips','Spine','Chest','LeftShoulder','RightShoulder','LeftUpperArm','RightUpperArm'],
  fashion:['Hips','Spine','Chest','LeftShoulder','RightShoulder','LeftUpperArm','RightUpperArm','LeftUpperLeg','RightUpperLeg'],
  wrists:['LeftUpperArm','LeftLowerArm','LeftHand','RightUpperArm','RightLowerArm','RightHand'],
  hands:['LeftLowerArm','LeftHand','RightLowerArm','RightHand'],
  waist:['Hips','Spine','LeftUpperLeg','RightUpperLeg'],
  legs:['Hips','LeftUpperLeg','LeftLowerLeg','LeftFoot','RightUpperLeg','RightLowerLeg','RightFoot'],
  feet:['LeftLowerLeg','LeftFoot','RightLowerLeg','RightFoot'],
  cape:['Hips','Spine','Chest','LeftShoulder','RightShoulder'],
};

export interface GarmentFitSafety {
  /** Desired rest-space gap from sampled avatar surface. */
  clearance:number;
  /** Never move one vertex farther than this during automatic correction. */
  maxCorrection:number;
  /** Search radius for nearby avatar surface samples. */
  searchRadius:number;
}

const DEFAULT:GarmentFitSafety={clearance:.008,maxCorrection:.026,searchRadius:.075};
const BY_SLOT:Partial<Record<Slot,GarmentFitSafety>>={
  shoulders:{clearance:.012,maxCorrection:.032,searchRadius:.09},
  chest:{clearance:.010,maxCorrection:.030,searchRadius:.085},
  fashion:{clearance:.012,maxCorrection:.032,searchRadius:.09},
  wrists:{clearance:.006,maxCorrection:.020,searchRadius:.055},
  hands:{clearance:.005,maxCorrection:.018,searchRadius:.05},
  waist:{clearance:.009,maxCorrection:.026,searchRadius:.075},
  legs:{clearance:.009,maxCorrection:.026,searchRadius:.075},
  feet:{clearance:.006,maxCorrection:.020,searchRadius:.055},
  cape:{clearance:.018,maxCorrection:.036,searchRadius:.10},
};

export function garmentFitSafety(slot:Slot):GarmentFitSafety{return BY_SLOT[slot]??DEFAULT;}
export function garmentMorphNames(slot:Slot){return GARMENT_MORPHS_BY_SLOT[slot]??[];}
export function autoRigBoneNames(slot:Slot){return AUTO_RIG_BONES_BY_SLOT[slot]??['Hips','Spine','Chest'];}
export function isBodyFitSlot(slot:Slot|undefined):slot is Slot{return !!slot&&BODY_FIT_SLOTS.has(slot);}
export const HF8_CLEARANCE_MORPH='HF8Clearance';
