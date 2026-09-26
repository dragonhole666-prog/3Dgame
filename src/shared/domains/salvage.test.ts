import { describe, expect, it } from 'vitest';
import { createItem } from './item';
import { salvageYield } from './salvage';

describe('salvageYield',()=>{
 it('rejects non-equipment materials',()=>{
  expect(salvageYield(createItem('red-feather',()=>0.5))).toBe(0);
 });
 it('rewards rarity, quality and enhancement without randomness',()=>{
  const item=createItem('heaven-sword',()=>0.5);item.quality=100;item.enhancementLevel=3;
  expect(salvageYield(item)).toBe(20);
  expect(salvageYield(item)).toBe(20);
 });
});
