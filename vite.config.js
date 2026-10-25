import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build` builds the real app for Vercel.
// `npm run build:demo` builds one self-contained offline HTML file (no backend) for trying it out.
export default defineConfig(({ mode }) => {
  const demo = mode === 'demo'
  return {
    plugins: [react(), ...(demo ? [viteSingleFile()] : [])],
    define: demo ? {
      'import.meta.env.VITE_SUPABASE_URL': '""',
      'import.meta.env.VITE_SUPABASE_ANON_KEY': '""',
      'import.meta.env.VITE_VAPID_PUBLIC_KEY': '""',
      'import.meta.env.VITE_DEMO': '"1"',
    } : {},
    build: demo ? { outDir: 'dist-demo', assetsInlineLimit: 100000000, cssCodeSplit: false } : { outDir: 'dist' },
  }
})
