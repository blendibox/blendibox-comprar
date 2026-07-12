import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Em um GitHub Pages de projeto (https://usuario.github.io/repo/) o site fica
// dentro de um subdiretório, então o "base" precisa apontar pro nome do repo.
// Definimos via env var pra não precisar editar este arquivo toda hora.
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
  // SKIP_PUBLIC_COPY=1 pula a cópia de public/ (que tem dezenas de milhares
  // de arquivos de dados e é o gargalo do build) — só serve pra iterar rápido
  // em debug local, nunca usar isso pro build de verdade.
  publicDir: process.env.SKIP_PUBLIC_COPY ? false : 'public',
  define: process.env.DEBUG_REACT ? { 'process.env.NODE_ENV': JSON.stringify('development') } : undefined,
  build: process.env.DEBUG_REACT ? { minify: false } : undefined,
})
