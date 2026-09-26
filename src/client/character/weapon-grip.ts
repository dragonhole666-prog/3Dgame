import type { WeaponProfile } from '../../shared/types';

export type GripSide='right'|'left';
export interface GripPointProfile {
 side:GripSide;
 /** Handle/shaft offset from the primary weapon pivot, in weapon-mount local metres. */
 offset:[number,number,number];
 /** Approximate physical handle radius used by the finger solver. */
 handleRadius:number;
 /** How deep the weapon pivot sits inside the palm rather than on the skin surface. */
 palmInset:number;
 /** Multiplier for iterative finger closure. */
 fingerStrength:number;
}
export interface SecondaryGripProfile extends GripPointProfile {
 /** Arm IK strength outside an authored combat one-shot. */
 idleIk:number;
 /** Arm IK strength during attack/skill clips. */
 combatIk:number;
 /** Optional safety cap for support-hand correction outside combat. */
 idleCap?:number;
 /** Optional safety cap for support-hand correction during attack/skill clips. */
 combatCap?:number;
}
export interface WeaponGripProfile {
 primary:GripPointProfile;
 secondary?:SecondaryGripProfile;
 /** Dual weapons instantiate the same mainhand prop on the opposite hand. */
 mirroredSecondaryWeapon?:boolean;
 /** Optional local XYZ Euler rotation for procedural/fallback weapon geometry before it is mounted. */
 proceduralMountRotation?:[number,number,number];
}

/**
 * R26 physical-contact-only grip schema.
 *
 * Weapon *pose* no longer comes from hand-axis IK.  The weapon follows the anatomical palm socket
 * and the character pose comes from authored VRMA upper-body animation.  IK is retained only where
 * there is a real second contact point (greatsword/spear/staff), while finger closure remains local to the
 * hand.  This mirrors a conventional layered-animation pipeline: locomotion -> authored upper body
 * -> tiny contact fixup, instead of solving the whole arm from a world-space target every frame.
 */
export const WEAPON_GRIP_PROFILES:Readonly<Record<WeaponProfile,WeaponGripProfile>>={
 sword:{
  primary:{side:'right',offset:[0,0,0],handleRadius:.027,palmInset:.014,fingerStrength:.92},
 },
 greatsword:{
  primary:{side:'right',offset:[0,0,0],handleRadius:.032,palmInset:.015,fingerStrength:.94},
  secondary:{side:'left',offset:[0,.22,0],handleRadius:.032,palmInset:.015,fingerStrength:.88,idleIk:.12,combatIk:.08},
 },
 dual:{
  primary:{side:'right',offset:[0,0,0],handleRadius:.026,palmInset:.014,fingerStrength:.90},
  secondary:{side:'left',offset:[0,0,0],handleRadius:.026,palmInset:.014,fingerStrength:.90,idleIk:0,combatIk:0},
  mirroredSecondaryWeapon:true,
 },
 spear:{
  primary:{side:'right',offset:[0,0,0],handleRadius:.031,palmInset:.015,fingerStrength:.94},
  secondary:{side:'left',offset:[0,.44,0],handleRadius:.031,palmInset:.015,fingerStrength:.94,idleIk:.34,combatIk:.82,idleCap:.38,combatCap:.86},
 },
 staff:{
  // P0.26.8: a two-hand staff stays physically two-handed during attacks. The authored clip owns
  // torso/weapon momentum, while the left-arm contact solver keeps the support palm on the shaft.
  primary:{side:'right',offset:[0,0,0],handleRadius:.033,palmInset:.015,fingerStrength:.92},
  secondary:{side:'left',offset:[0,.40,0],handleRadius:.033,palmInset:.015,fingerStrength:.92,idleIk:.30,combatIk:.76,idleCap:.34,combatCap:.80},
 },
 bow:{
  // Bow hand owns the physical grip; string hand is never constrained by a fake secondary grip.
  primary:{side:'left',offset:[0,0,0],handleRadius:.022,palmInset:.012,fingerStrength:.88},
  // P0.26.8: bow facing is solved by the runtime against character/world forward. Do not bake a
  // hand-local Y rotation here; VRM palm axes differ between avatars and can flip the bow backward.
  proceduralMountRotation:[0,0,0],
 },
};

export function weaponGripProfile(profile:WeaponProfile){return WEAPON_GRIP_PROFILES[profile];}
