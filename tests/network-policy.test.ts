import {describe,expect,it} from 'vitest';
import {CONGESTED_SNAPSHOT_TICK_INTERVAL,NETWORK_POLICY,SNAPSHOT_TICK_INTERVAL,reconnectDelayMs,snapshotTickInterval} from '../src/shared/network/network-policy';

describe('network policy',()=>{
 it('keeps simulation and snapshot cadence data-driven',()=>{
  expect(NETWORK_POLICY.simulationHz).toBe(20);
  expect(SNAPSHOT_TICK_INTERVAL).toBe(2);
  expect(CONGESTED_SNAPSHOT_TICK_INTERVAL).toBeGreaterThan(SNAPSHOT_TICK_INTERVAL);
 });
 it('backs off snapshot frequency under websocket pressure',()=>{
  expect(snapshotTickInterval(0)).toBe(SNAPSHOT_TICK_INTERVAL);
  expect(snapshotTickInterval(NETWORK_POLICY.softBufferedBytes)).toBe(CONGESTED_SNAPSHOT_TICK_INTERVAL);
  expect(snapshotTickInterval(NETWORK_POLICY.hardBufferedBytes)).toBe(0);
 });
 it('uses bounded reconnect backoff',()=>{
  expect(reconnectDelayMs(0,()=>.5)).toBe(NETWORK_POLICY.reconnectBaseMs);
  expect(reconnectDelayMs(20,()=>.5)).toBe(NETWORK_POLICY.reconnectMaxMs);
 });
});
