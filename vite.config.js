import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pure client-side Vite app for LectureLens.
// Served on 0.0.0.0:3000 to match the preview ingress.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: true,
    hmr: { clientPort: 443 },
    watch: {
      // /app/frontend is a self-referential symlink for the preview proxy;
      // ignore it (and node_modules) so chokidar doesn't hit ELOOP.
      ignored: ['**/frontend/**', '**/node_modules/**', '**/.git/**'],
      followSymlinks: false,
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
})
