import { defineConfig } from 'vite';

export default defineConfig({
 assetsInclude:['**/*.glb','**/*.gltf','**/*.hdr','**/*.exr'],
 server:{
  port:5173,
  strictPort:true,
  proxy:{
   '/socket':{target:'ws://127.0.0.1:8787',ws:true},
   '/health':'http://127.0.0.1:8787',
   '/api':'http://127.0.0.1:8787'
  }
 },
 build:{
  chunkSizeWarningLimit:900,
  rollupOptions:{
   output:{
    manualChunks:{
     three:['three'],
     vrm:['@pixiv/three-vrm'],
     pathfinding:['three-pathfinding']
    }
   }
  }
 }
});
