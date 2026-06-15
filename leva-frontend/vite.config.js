import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['levastudy.my.id', 'www.levastudy.my.id', '157.245.157.234'],
  },
});
