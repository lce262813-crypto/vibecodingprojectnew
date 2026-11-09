import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Listen on the local network too, so a phone on the same Wi-Fi can open
    // http://<this PC's IP>:5173 during development.
    host: true,
    // Allow opening the dev server through an ngrok tunnel.
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', '.ngrok.app', '.ngrok.io'],
    // Through a tunnel there is only one address, so the frontend server
    // forwards /api requests to the local backend.
    proxy: { '/api': 'http://localhost:8000' },
  },
})
