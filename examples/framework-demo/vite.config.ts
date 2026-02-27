import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import fabrk from '@fabrk/framework'

export default defineConfig({
  plugins: [
    ...fabrk(),
    tailwindcss(),
  ],
})
