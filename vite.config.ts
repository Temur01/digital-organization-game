import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

// Dev-serverda React Refresh inline skript ishlatadi, shuning uchun CSP faqat build’ga qo‘shiladi.
// Supabase ulangan bo‘lsa — faqat o‘sha manzilga so‘rov yuborishga ruxsat beriladi.
function buildCsp(supabaseUrl?: string): string {
  let backend = '';
  try {
    if (supabaseUrl) backend = ` ${new URL(supabaseUrl).origin}`;
  } catch {
    backend = '';
  }
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    `connect-src 'self'${backend}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
}

function cspPlugin(CSP: string): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<!--CSP-->', `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), cspPlugin(buildCsp(loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL))],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
}));
