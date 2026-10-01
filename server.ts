import express from 'express';
import path from 'path';
import fs from 'fs';
import app from './api/index';

const PORT = Number(process.env.PORT) || 3000;

// Mount Vite in dev mode or serve static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ['**/data/**', '**/tc_database.json', '**/*.json', '**/dist/**', '**/dist-server/**'],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Portal TC Surabaya Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
