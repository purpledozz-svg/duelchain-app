import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@splinetool') || id.includes('react-spline')) return 'spline';
          if (id.includes('/three/') || id.includes('@react-three')) return 'three';
          if (
            id.includes('wagmi') ||
            id.includes('viem') ||
            id.includes('@rainbow-me') ||
            id.includes('@walletconnect') ||
            id.includes('@coinbase/wallet') ||
            id.includes('@metamask') ||
            id.includes('@reown') ||
            id.includes('ox/')
          )
            return 'web3';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/')) {
            return 'react-vendor';
          }
        },
      },
    },
  },
});
