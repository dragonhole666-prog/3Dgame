export type HF265QuaterniusAssetId='common-tree-1'|'common-tree-3'|'twisted-tree-1'|'pine-2'|'rock-medium-1'|'rock-medium-3'|'bush-flowers'|'flower-3'|'grass-short';

const ROOT='https://raw.githubusercontent.com/agentkaerf/FreeModels/main/Stylized%20Nature%20MegaKit%5BStandard%5D/glTF';
export const HF265_QUATERNIUS_LICENSE='CC0-1.0';
export const HF265_QUATERNIUS_SOURCE='Quaternius Stylized Nature MegaKit Standard';

const files:Record<HF265QuaterniusAssetId,string>={
 'common-tree-1':'CommonTree_1.gltf',
 'common-tree-3':'CommonTree_3.gltf',
 'twisted-tree-1':'TwistedTree_1.gltf',
 'pine-2':'Pine_2.gltf',
 'rock-medium-1':'Rock_Medium_1.gltf',
 'rock-medium-3':'Rock_Medium_3.gltf',
 'bush-flowers':'Bush_Common_Flowers.gltf',
 'flower-3':'Flower_3_Group.gltf',
 'grass-short':'Grass_Common_Short.gltf',
};

export function quaterniusNatureUrl(id:HF265QuaterniusAssetId){
 const local=`/assets/quaternius/nature/${files[id]}`;
 // HF26.5 ships a vendor script. Until it is run, browser runtime can use the
 // same verified CC0 files from the public mirror without blocking startup.
 return {local,remote:`${ROOT}/${encodeURIComponent(files[id])}`};
}
