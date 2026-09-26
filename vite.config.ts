import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude:['**/*.glb','**/*.gltf','**/*.hdr','**/*.env','**/*.exr'],
  server:{
    host:'0.0.0.0',
    port:5173,
    strictPort:true
  },
  build:{
    target:'es2022',
    chunkSizeWarningLimit:1800,
    sourcemap:true
  }
});
