import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      css: {
        devSourcemap: true,
      },
      build: {
        rollupOptions: {
          output: {
            assetFileNames: (assetInfo) => {
              const info = assetInfo.name.split('.');
              const ext = info[info.length - 1];
              if (/\.(css)$/.test(assetInfo.name)) {
                return `assets/[name]-[hash][extname]`;
              }
              if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
                return `assets/images/[name]-[hash][extname]`;
              }
              return `assets/[name]-[hash][extname]`;
            },
          },
        },
      },
      server: {
        headers: {
          'X-Content-Type-Options': 'nosniff',
        },
      },
    };
});
