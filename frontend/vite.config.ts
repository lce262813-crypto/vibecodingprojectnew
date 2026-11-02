import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Listen on the local network too, so a phone on the same Wi-Fi can open
  // http://<this PC's IP>:5173 during development.
  server: { host: true },
})
