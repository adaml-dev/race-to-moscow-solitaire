import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      // To jest kluczowe dla Codespaces: wymusza użycie portu klienta (443/HTTPS)
      // zamiast losowego portu wewnętrznego kontenera.
      clientPort: 443,
    },
    // Opcjonalnie: nasłuchuj na wszystkich adresach w kontenerze
    host: true
  }
})