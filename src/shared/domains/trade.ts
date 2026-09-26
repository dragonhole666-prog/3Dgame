import type { Listing, Player, TradeSession } from '../types';
import { ITEMS } from '../data/equipment';
import { addItems, canAdd } from './inventory';
export class TradeDomain {
 sessions=new Map<string,TradeSession>(); listings:Listing[]=[];
 constructor(private players:Map<string,Player>){}
 session(player:string){return [...this.sessions.values()].find(t=>t.participants.includes(player));}
 private player(id:string){const p=this.players.get(id);if(!p)throw new Error('行者已離線。');return p;}
 reserved(player:string,item:string){return !!this.session(player)?.offers[player].items.includes(item);}
 request(a:string,b:string){if(a===b||this.session(a)||this.session(b))throw new Error('已有進行中的交易。');const other=this.player(b);if(!other.online)throw new Error('對方不在線上。');const t:TradeSession={id:crypto.randomUUID(),participants:[a,b],offers:{[a]:{items:[],gold:0,locked:false,confirmed:false},[b]:{items:[],gold:0,locked:false,confirmed:false}},revision:0};this.sessions.set(t.id,t);return t;}
 offer(id:string,items:string[],gold:number){const t=this.session(id);if(!t)throw new Error('沒有進行中的交易。');const p=this.player(id);if(!Number.isSafeInteger(gold)||gold<0||gold>p.gold||items.length>8||new Set(items).size!==items.length)throw new Error('交易內容無效。');for(const itemId of items){const item=p.inventory.find(i=>i.id===itemId);if(!item||!ITEMS[item.baseId].tradable)throw new Error('無法交易此物品。');}t.offers[id]={items:[...items],gold,locked:false,confirmed:false};for(const offer of Object.values(t.offers)){offer.locked=false;offer.confirmed=false;}t.revision++;}
 lock(id:string,revision:number){const t=this.session(id);if(!t||t.revision!==revision)throw new Error('提案已更動，請重新檢查。');t.offers[id].locked=true;}
 confirm(id:string,revision:number){
  const t=this.session(id);if(!t||t.revision!==revision||!Object.values(t.offers).every(o=>o.locked))throw new Error('雙方必須先鎖定目前提案。');
  t.offers[id].confirmed=true;if(!Object.values(t.offers).every(o=>o.confirmed))return false;
  const [a,b]=t.participants.map(x=>this.player(x));const oa=t.offers[a.id],ob=t.offers[b.id];
  const ai=oa.items.map(id=>a.inventory.find(i=>i.id===id)),bi=ob.items.map(id=>b.inventory.find(i=>i.id===id));
  if(ai.some(i=>!i)||bi.some(i=>!i)||a.gold<oa.gold||b.gold<ob.gold)throw new Error('資產狀態已更動，無法完成交易。');
  const ar=a.inventory.filter(i=>!oa.items.includes(i.id)),br=b.inventory.filter(i=>!ob.items.includes(i.id));
  if(!canAdd(ar,bi as NonNullable<typeof bi[number]>[])||!canAdd(br,ai as NonNullable<typeof ai[number]>[]))throw new Error('其中一方行囊空間不足。');
  a.inventory=ar;b.inventory=br;addItems(a,bi as NonNullable<typeof bi[number]>[]);addItems(b,ai as NonNullable<typeof ai[number]>[]);
  a.gold+=ob.gold-oa.gold;b.gold+=oa.gold-ob.gold;a.revision++;b.revision++;this.sessions.delete(t.id);return true;
 }
 cancel(id:string){const t=this.session(id);if(t)this.sessions.delete(t.id);}
 list(id:string,itemId:string,price:number){const p=this.player(id);if(!Number.isSafeInteger(price)||price<1||price>1e9)throw new Error('請輸入有效售價。');if(this.reserved(id,itemId))throw new Error('物品已在交易提案中。');const item=p.inventory.find(i=>i.id===itemId);if(!item||!ITEMS[item.baseId].tradable)throw new Error('物品不可上架。');if(this.listings.filter(l=>l.seller===id).length>=12)throw new Error('最多上架 12 件物品。');p.inventory=p.inventory.filter(i=>i.id!==itemId);this.listings.push({id:crypto.randomUUID(),seller:id,sellerName:p.name,item,price,createdAt:Date.now()});p.revision++;}
 buy(id:string,listingId:string){const p=this.player(id),l=this.listings.find(x=>x.id===listingId);if(!l)throw new Error('物品已售出。');if(l.seller===id)throw new Error('無法購買自己的物品。');if(p.gold<l.price)throw new Error('靈石不足。');if(!canAdd(p.inventory,[l.item]))throw new Error('行囊已滿。');const seller=this.player(l.seller);addItems(p,[l.item]);p.gold-=l.price;seller.gold+=l.price;this.listings=this.listings.filter(x=>x.id!==listingId);p.revision++;seller.revision++;}
 unlist(id:string,listingId:string){const p=this.player(id),l=this.listings.find(x=>x.id===listingId&&x.seller===id);if(!l)throw new Error('找不到委託。');addItems(p,[l.item]);this.listings=this.listings.filter(x=>x.id!==listingId);p.revision++;}
}
