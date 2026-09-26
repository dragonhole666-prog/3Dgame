import * as T from 'three';

type Palette={cloth:T.ColorRepresentation;clothDark:T.ColorRepresentation;trim:T.ColorRepresentation;jade:T.ColorRepresentation;inner:T.ColorRepresentation;silver:T.ColorRepresentation;warm:T.ColorRepresentation};
const PALETTES:Record<'scholar'|'immortal'|'regal'|'crimson',Palette>={
 scholar:{cloth:'#8197A2',clothDark:'#536B77',trim:'#B58863',jade:'#92B4AA',inner:'#D7D0C3',silver:'#CBD6DB',warm:'#D99778'},
 immortal:{cloth:'#A3B5BD',clothDark:'#657E8B',trim:'#D5AC75',jade:'#A4C3B9',inner:'#E2D5C8',silver:'#D8E3E8',warm:'#E3A083'},
 regal:{cloth:'#526E7B',clothDark:'#344F5C',trim:'#C59862',jade:'#7EAAA5',inner:'#D4C1AE',silver:'#C8D4DA',warm:'#D78A72'},
 crimson:{cloth:'#A65B4D',clothDark:'#6D3B36',trim:'#B88A59',jade:'#829C91',inner:'#D8B8A6',silver:'#CBD2D4',warm:'#E19A7B'},
};
function paletteFor(itemId:string){if(/thunder|mythic|primordial|demon|heavenfall|celestial/i.test(itemId))return PALETTES.regal;if(/cloud|snow|jade|heaven|immortal/i.test(itemId))return PALETTES.immortal;if(/fire|blood|flame|crimson/i.test(itemId))return PALETTES.crimson;return PALETTES.scholar;}
function role(key:string,slot:string){
 if(slot==='mainhand'||slot==='offhand'||/blade|sword|spear|staff|bow|weapon/.test(key))return /grip|handle|wood/.test(key)?'leather':/jade|gem|crystal/.test(key)?'jade':/guard|pommel|trim|ornament|gold/.test(key)?'gold':'silver';
 if(/jade|gem|crystal/.test(key))return 'jade';if(/metal|trim|buckle|ring|ornament|crown|armor|bracer|belt|gold/.test(key))return 'gold';if(/lining|inner|undershirt/.test(key))return 'inner';if(/leather|strap|boot|shoe|glove/.test(key))return 'leather';if(/dark|shadow|secondary/.test(key))return 'clothDark';return 'cloth';
}
export function applyHF265EquipmentArtDirection(root:T.Object3D,itemId:string,slot:string){
 const p=paletteFor(itemId);root.traverse(o=>{if(!(o instanceof T.Mesh||o instanceof T.SkinnedMesh))return;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(!(m instanceof T.MeshStandardMaterial))continue;const key=(itemId+' '+o.name+' '+m.name).toLowerCase(),r=role(key,slot);m.dithering=true;
  if(r==='cloth'||r==='clothDark'||r==='inner'){m.color.set(r==='cloth'?p.cloth:r==='clothDark'?p.clothDark:p.inner);m.metalness=0;m.roughness=r==='inner'?.82:.76;m.envMapIntensity=.38;}
  else if(r==='gold'){m.color.set(p.trim);m.metalness=.72;m.roughness=.31;m.envMapIntensity=1.18;}
  else if(r==='silver'){m.color.set(p.silver);m.metalness=.82;m.roughness=.25;m.envMapIntensity=1.28;}
  else if(r==='jade'){m.color.set(p.jade);m.metalness=.08;m.roughness=.30;m.envMapIntensity=.95;m.emissive.set(p.jade);m.emissiveIntensity=.015;}
  else {m.color.set('#6C5547');m.metalness=.02;m.roughness=.70;m.envMapIntensity=.48;}
  m.needsUpdate=true;
 }});root.userData.hf265ArtDirection='mist-blue / antique-gold / jade / coral';
}
