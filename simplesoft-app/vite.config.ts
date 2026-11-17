import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Frontend SimpleSoft. Puerto 5175 (Tickets usa 5174, Licencias 5173).
// Backend SimpleSoft.Api: localhost:5070. Las rutas de la API ya empiezan con /api, por eso el proxy no reescribe nada.
// En producción el front se sirve desde la subcarpeta /cambio-denominacion-app/ de IIS (por eso el `base` del build);
// en desarrollo sigue en la raíz.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/cambio-denominacion-app/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    proxy: {
      '/api': { target: 'http://localhost:5070', changeOrigin: true },
    },
  },
}))
