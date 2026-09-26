export type Vec2 = { x: number; z: number };
export type Rarity = 'broken'|'common'|'fine'|'rare'|'epic'|'legendary'|'immortal'|'mythic';
export type Slot = 'head'|'shoulders'|'chest'|'wrists'|'hands'|'waist'|'legs'|'feet'|'mainhand'|'offhand'|'cape'|'neck'|'ring'|'charm'|'artifact'|'back'|'fashion';
export type WeaponProfile = 'sword'|'greatsword'|'dual'|'spear'|'staff'|'bow';
export type WeaponHandedness = 'one'|'two'|'paired';
export type Stat = 'str'|'agi'|'vit'|'int'|'attack'|'defense'|'hp'|'accuracy'|'evasion'|'crit'|'critDamage'|'haste'|'penetration'|'fire'|'frost'|'lightning'|'fireResist'|'frostResist'|'lightningResist'|'lifesteal';
export type Stats = Record<Stat,number>;
export interface Affix { id: string; stat: Stat; value: number; min: number; max: number }
export interface ItemBase { id: string; name: string; type: 'equipment'|'material'; subtype: string; slot?: Slot; rarity: Rarity; itemLevel: number; requiredLevel: number; baseStats: Partial<Stats>; affixPool: string[]; sellPrice: number; tradable: boolean; icon: string; mesh: string; material: string; vfx?: string; dropSource: string[]; appearanceId?: string; handedness?: WeaponHandedness; description: string }
export interface ItemInstance { id: string; baseId: string; rarity: Rarity; itemLevel: number; quality: number; affixes: Affix[]; quantity: number; durability: number; identified: boolean; enhancementLevel:number; evolutionState:string; sockets:({gemId:string}|null)[] }
export interface Appearance { id: string; slot: Slot; mesh: string; material: string; color: string; trim: string; attachBone: string; shape: string; length: number; width: number; ornaments: number; hideBody: string[]; hideHair?: boolean; vfx?: 'lightning'|'flame'|'frost'|'runes'|'aura'; animationProfile?: WeaponProfile; positionOffset: [number,number,number]; rotationOffset: [number,number,number]; scale: number }
export interface LootEntry { itemId: string; weight: number; minQuantity: number; maxQuantity: number; rarity?: Rarity; conditions?: 'firstKill'|'boss' }
export interface LootTable { id: string; rolls: number; chance: number; entries: LootEntry[]; guaranteed?: LootEntry[] }
export type AIState = 'Idle'|'Patrol'|'Suspicious'|'Aggro'|'Chase'|'Combat'|'Leash'|'Return'|'Dead';
export type MonsterTier='mutant'|'ancient'|'godbeast';
export interface MonsterDef { id: string; name: string; level: number; recommendedLevel: string; hp: number; attack: number; defense: number; speed: number; aggroRange: number; attackRange: number; aiProfile: 'pack'|'ambush'|'territorial'|'passive'|'boss'|'ranged'; skills: string[]; spawnArea: string; lootTable: string; model: string; animations: string; vfx?: string; scale: number; /** Optional rendered height relative to the 1.92 m player reference. */ visualHeightRatio?: number; combatRadius?: number; color: string; element: string; description: string; respawn: number; tier?:MonsterTier; spawnCount?:number; spawnOffset?:{x:number;z:number}; mutation?:string; bossTitle?:string; bossBehavior?:'queen-duelist'; assetLocal?:string; assetUrl?:string; assetLicense?:'CC0-1.0'|'user-supplied' }
export interface AttackState { id: number; skill: string; started: number; hitAt: number; hitWindowStart?: number; hitWindowEnd?: number; endsAt: number; resolved: boolean; target?: string; point: Vec2; lungeDistance?: number; lungeApplied?: number }
export interface ActiveEffect {id:string;source:string;started:number;expires:number;nextTick:number;stacks:number}
export interface Actor extends Vec2 { id: string; hp: number; maxHp: number; angle: number; speed: number; state: string; attack?: AttackState; hitAt: number; staggerUntil: number; deadAt?: number; effects?:ActiveEffect[] }
export interface Monster extends Actor { defId: string; home: Vec2; target?: string; nextAttack: number; aiTimer: number; cycle: number; contributors: Record<string,number>; patrol?: Vec2 }
export interface Player extends Actor { name: string; level: number; xp: number; mp: number; maxMp: number; gold: number; inventory: ItemInstance[]; equipment: Partial<Record<Slot,ItemInstance>>; stats: Stats; target?: string; autoAttack?:boolean; queuedSkill?:string; pursuitNextAt?:number; bufferedSkill?:string; bufferedTarget?:string; input: Vec2 & { sprint: boolean }; inputAt: number; path: Vec2[]; navLabel?: string; cooldowns: Record<string,number>; known: string[]; kills: Record<string,number>; online: boolean; revision: number; jumpAt: number; flight?: boolean; }
export type PublicPlayer = Pick<Player,'id'|'name'|'level'|'hp'|'maxHp'|'mp'|'maxMp'|'x'|'z'|'angle'|'speed'|'state'|'attack'|'hitAt'|'staggerUntil'|'equipment'|'jumpAt'|'flight'>;
export interface Drop extends Vec2 { id: string; item: ItemInstance; owner: string; publicAt: number; expiresAt: number }
export interface GameEvent { id: number; type: 'hit'|'death'|'drop'|'pickup'|'equip'|'notice'|'chat'|'cast'|'level'|'trade'; actor?: string; target?: string; x?: number; z?: number; value?: number; critical?: boolean; text?: string; rarity?: Rarity; skill?: string; itemId?: string; angle?: number; weaponProfile?: WeaponProfile; weaponElement?: 'none'|'lightning'|'fire'|'frost'|'arcane'; originX?: number; originZ?: number; impactDelay?: number; /** Authoritative server seconds when the cast began. */ castAt?: number; /** Authoritative server seconds when damage resolves. */ impactAt?: number }
export interface TradeOffer { items: string[]; gold: number; locked: boolean; confirmed: boolean }
export interface TradeSession { id: string; participants: [string,string]; offers: Record<string,TradeOffer>; revision: number }
export interface Listing { id: string; seller: string; sellerName: string; item: ItemInstance; price: number; createdAt: number }
export interface Snapshot { time: number; self: Player; players: PublicPlayer[]; monsters: Monster[]; drops: Drop[]; events: GameEvent[]; trade?: TradeSession; listings: Listing[] }
export type Command =
 | { type: 'move'; x: number; z: number; sprint: boolean }
 | { type: 'navigate'; x: number; z: number; label?: string }
 | { type: 'target'; id?: string } | { type: 'attack'; skill: string; target?: string }
 | { type: 'pickup'; id?: string } | { type: 'equip'; id: string } | { type: 'unequip'; slot: Slot }
 | { type: 'identify'; id: string } | { type: 'discard'; id: string } | { type: 'destroy'; id: string } | { type: 'salvage'; id: string } | { type: 'intel'; npc: string }
 | { type: 'jump' } | { type: 'flight'; enabled?: boolean } | { type: 'revive'; town: boolean } | { type: 'repair' } | {type:'enhance';id:string} | {type:'potion'}
 | { type: 'chat'; text: string }
 | { type: 'tradeRequest'; player: string } | { type: 'tradeOffer'; items: string[]; gold: number }
 | { type: 'tradeLock'; revision: number } | { type: 'tradeConfirm'; revision: number } | { type: 'tradeCancel' }
 | { type: 'list'; item: string; price: number } | { type: 'buy'; id: string } | { type: 'unlist'; id: string };
export const distance = (a:Vec2,b:Vec2) => Math.hypot(a.x-b.x,a.z-b.z);
export const clamp = (n:number,min:number,max:number) => Math.max(min,Math.min(max,n));
