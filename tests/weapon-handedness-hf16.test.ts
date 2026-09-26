import {describe,it,expect} from 'vitest';
import {ITEMS,STARTER_ITEMS} from '../src/shared/data/equipment';
import {isTwoHandedWeapon} from '../src/shared/domains/equipment';

describe('HF16 data-driven weapon handedness',()=>{
 it('keeps ordinary swords one-handed so shields remain legal',()=>{
  expect(ITEMS['iron-sword'].handedness).toBe('one');
  expect(isTwoHandedWeapon(ITEMS['iron-sword'])).toBe(false);
  expect(ITEMS['green-ward-shield'].slot).toBe('offhand');
 });
 it('adds a real one-hand wand without weakening long staff rules',()=>{
  expect(ITEMS['spirit-wand'].handedness).toBe('one');
  expect(ITEMS['spirit-wand'].subtype).toBe('staff');
  expect(isTwoHandedWeapon(ITEMS['spirit-wand'])).toBe(false);
  expect(ITEMS['star-staff'].handedness).toBe('two');
  expect(isTwoHandedWeapon(ITEMS['star-staff'])).toBe(true);
 });
 it('ships testable magical/offensive offhands with the starter inventory',()=>{
  expect(ITEMS['moon-disc'].slot).toBe('offhand');
  expect(ITEMS['moon-dagger'].slot).toBe('offhand');
  expect(ITEMS['moon-dagger'].baseStats.attack).toBeGreaterThan(0);
  expect(STARTER_ITEMS).toEqual(expect.arrayContaining(['spirit-wand','moon-disc','moon-dagger']));
 });
 it('keeps true two-hand and paired profiles blocking offhand',()=>{
  for(const id of ['mountain-blade','jade-spear','star-staff','frost-bow','twin-moon'])expect(isTwoHandedWeapon(ITEMS[id]),id).toBe(true);
 });
});
