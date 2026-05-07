import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ENDAP Studio',
        short_name: 'ENDAP Studio',
        description: 'Configurador, simulador Ladder e diagnóstico local para o ENDAP.',
        theme_color: '#071113',
        background_color: '#071113',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: []
      }
    })
  ]
});
