import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * Shared GLTF loader factory for gameplay assets.
 *
 * Several user supplied GLBs are compressed with EXT_meshopt_compression. Three.js' GLTFLoader
 * does not decode those payloads until a MeshoptDecoder is explicitly registered, so using a raw
 * `new GLTFLoader()` silently falls through to procedural placeholders in higher-level loaders.
 * Keep this configuration centralized so monsters and equipment cannot drift apart again.
 */
export function createGameGLTFLoader(){
  const loader=new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}
