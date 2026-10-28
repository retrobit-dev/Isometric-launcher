import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Preview diakses lewat host proxy sandbox, jadi:
// - bind ke semua interface (0.0.0.0)
// - izinkan semua host header
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
  },
})
