export type PanelId='inventory'|'equipment'|'creator'|'map'|'bestiary'|'market'|'settings'|'npc'|'trade';

export interface PanelDefinition {
  id:PanelId;
  title:string;
  subtitle:string;
  icon:string;
  menuLabel?:string;
  hotkeys:readonly string[];
  showInFunctionMenu:boolean;
}

export const PANEL_DEFINITIONS:Readonly<Record<PanelId,PanelDefinition>>=Object.freeze({
  inventory:{id:'inventory',title:'行囊',subtitle:'山海所獲 · 隨身珍藏',icon:'bag',menuLabel:'行囊',hotkeys:['b','i'],showInFunctionMenu:true},
  equipment:{id:'equipment',title:'人物',subtitle:'角色總覽 · 裝備與屬性',icon:'person',menuLabel:'人物',hotkeys:['c'],showInFunctionMenu:true},
  creator:{id:'creator',title:'整形 / 選角',subtitle:'VRM 選角 · 五官 · 身形 · 色彩',icon:'person',menuLabel:'整形/選角',hotkeys:['v'],showInFunctionMenu:true},
  map:{id:'map',title:'青嵐谷',subtitle:'點選地圖 · 循古道而行',icon:'compass',menuLabel:'地圖',hotkeys:['m'],showInFunctionMenu:true},
  bestiary:{id:'bestiary',title:'山海圖鑑',subtitle:'知其形 · 尋其跡',icon:'book',menuLabel:'異獸',hotkeys:['n'],showInFunctionMenu:true},
  market:{id:'market',title:'山海市集',subtitle:'行者之間 · 萬物有價',icon:'coin',menuLabel:'市集',hotkeys:['o'],showInFunctionMenu:true},
  settings:{id:'settings',title:'行旅設定',subtitle:'調整此間聲色',icon:'settings',menuLabel:'設定',hotkeys:['f10'],showInFunctionMenu:true},
  npc:{id:'npc',title:'山海見聞',subtitle:'居民情報',icon:'book',hotkeys:[],showInFunctionMenu:false},
  trade:{id:'trade',title:'行者交易',subtitle:'檢查物品與靈石',icon:'coin',hotkeys:[],showInFunctionMenu:false}
});

export const FUNCTION_PANEL_IDS=(Object.values(PANEL_DEFINITIONS).filter(panel=>panel.showInFunctionMenu).map(panel=>panel.id)) as PanelId[];
const HOTKEY_TO_PANEL=new Map<string,PanelId>();
for(const panel of Object.values(PANEL_DEFINITIONS))for(const hotkey of panel.hotkeys)HOTKEY_TO_PANEL.set(hotkey.toLowerCase(),panel.id);
export const panelForHotkey=(key:string)=>HOTKEY_TO_PANEL.get(key.toLowerCase());
export const panelHotkeyLabel=(panel:PanelDefinition)=>panel.hotkeys[0]?.toUpperCase()??'';
