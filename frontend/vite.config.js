import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        allowedHosts: [
            'julee-gastronomic-georgene.ngrok-free.dev',
            '.ngrok-free.dev',  // Allow all ngrok free domains
            '.ngrok.io'         // Allow all ngrok domains
        ],
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            },
            '/images': {
                target: 'http://localhost:5000',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                ws: true,
            }
        }
    }
})