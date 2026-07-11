import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em um GitHub Pages de projeto (https://usuario.github.io/repo/) o site fica
// dentro de um subdiretório, então o "base" precisa apontar pro nome do repo.
// Definimos via env var pra não precisar editar este arquivo toda hora.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
})
