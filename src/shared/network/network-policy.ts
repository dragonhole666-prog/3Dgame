export interface NetworkPolicy {
  simulationHz:number;
  snapshotHz:number;
  congestedSnapshotHz:number;
  softBufferedBytes:number;
  hardBufferedBytes:number;
  playerInterestRadius:number;
  monsterInterestRadius:number;
  dropInterestRadius:number;
  eventInterestRadius:number;
  joinTimeoutMs:number;
  fallbackDelayMs:number;
  reconnectBaseMs:number;
  reconnectMaxMs:number;
  reconnectJitterRatio:number;
  resumeStaleMs:number;
  pendingCommandLimit:number;
  commandRateLimitPerSecond:number;
  positionCheckpointSeconds:number;
  fullSaveSeconds:number;
}

export const NETWORK_POLICY:Readonly<NetworkPolicy>=Object.freeze({
  simulationHz:20,
  snapshotHz:10,
  congestedSnapshotHz:4,
  softBufferedBytes:256*1024,
  hardBufferedBytes:2*1024*1024,
  playerInterestRadius:120,
  monsterInterestRadius:110,
  dropInterestRadius:72,
  eventInterestRadius:140,
  joinTimeoutMs:8000,
  fallbackDelayMs:150,
  reconnectBaseMs:750,
  reconnectMaxMs:8000,
  reconnectJitterRatio:.18,
  resumeStaleMs:12000,
  pendingCommandLimit:24,
  commandRateLimitPerSecond:70,
  positionCheckpointSeconds:1.5,
  fullSaveSeconds:5
});

export const SIMULATION_STEP=1/NETWORK_POLICY.simulationHz;
export const SIMULATION_INTERVAL_MS=Math.round(1000/NETWORK_POLICY.simulationHz);
export const SNAPSHOT_TICK_INTERVAL=Math.max(1,Math.round(NETWORK_POLICY.simulationHz/NETWORK_POLICY.snapshotHz));
export const CONGESTED_SNAPSHOT_TICK_INTERVAL=Math.max(SNAPSHOT_TICK_INTERVAL,Math.round(NETWORK_POLICY.simulationHz/NETWORK_POLICY.congestedSnapshotHz));
export const POSITION_CHECKPOINT_TICKS=Math.max(1,Math.round(NETWORK_POLICY.positionCheckpointSeconds*NETWORK_POLICY.simulationHz));
export const FULL_SAVE_TICKS=Math.max(1,Math.round(NETWORK_POLICY.fullSaveSeconds*NETWORK_POLICY.simulationHz));

export function snapshotTickInterval(bufferedBytes:number){
  if(bufferedBytes>=NETWORK_POLICY.hardBufferedBytes)return 0;
  return bufferedBytes>=NETWORK_POLICY.softBufferedBytes?CONGESTED_SNAPSHOT_TICK_INTERVAL:SNAPSHOT_TICK_INTERVAL;
}

export function shouldSendSnapshot(tick:number,bufferedBytes:number){
  const every=snapshotTickInterval(bufferedBytes);
  return every>0&&tick%every===0;
}

export function reconnectDelayMs(attempt:number,random=Math.random){
  const exponential=Math.min(NETWORK_POLICY.reconnectMaxMs,NETWORK_POLICY.reconnectBaseMs*2**Math.max(0,attempt));
  const jitter=exponential*NETWORK_POLICY.reconnectJitterRatio*(random()*2-1);
  return Math.max(NETWORK_POLICY.reconnectBaseMs,Math.round(exponential+jitter));
}

export const NETWORK_SNAPSHOT_SCOPE=Object.freeze({
  playerRadius:NETWORK_POLICY.playerInterestRadius,
  monsterRadius:NETWORK_POLICY.monsterInterestRadius,
  dropRadius:NETWORK_POLICY.dropInterestRadius,
  eventRadius:NETWORK_POLICY.eventInterestRadius
});

export const PERSISTENT_COMMANDS=new Set<string>(['equip','unequip','pickup','identify','discard','destroy','salvage','tradeConfirm','buy','list','unlist','repair']);
export const commandRequiresPersistence=(type:string)=>PERSISTENT_COMMANDS.has(type);
