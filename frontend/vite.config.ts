import { defineConfig, loadEnv } from 'vite'
import history from 'connect-history-api-fallback'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react(), {
        name: 'spa-fallback',
        configureServer(server) {
          server.middlewares.use(
            history({
              rewrites: [{ from: /./, to: '/index.html' }]
            })
          );
        }
      }],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { 
          target: env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000', 
          changeOrigin: true 
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
            map: ['maplibre-gl'],
          },
        },
      },
    },
  }
})
