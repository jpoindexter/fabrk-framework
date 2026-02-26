import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { agentPlugin, dashboardPlugin } from 'fabrk/fabrk'

export default defineConfig({
  plugins: [
    react(),
    agentPlugin(),
    dashboardPlugin(),
    tailwindcss(),
  ],
})
