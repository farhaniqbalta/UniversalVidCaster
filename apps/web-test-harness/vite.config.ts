import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [{
    name: 'local-bridge-controls',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (!request.url?.startsWith('/bridge-api/')) return next();
        const host = request.headers.host ?? '';
        const local = /^(localhost|127\.0\.0\.1):\d+$/.test(host);
        const origin = request.headers.origin;
        if (!local || (origin && origin !== `http://${host}`) ||
            (request.method !== 'GET' && origin !== `http://${host}`)) {
          response.statusCode = 403;
          response.end('Use the local harness to control the bridge.');
          return;
        }
        next();
      });
    },
  }],
  server: {
    proxy: {
      '/bridge-api': {
        target: 'http://127.0.0.1:8787', changeOrigin: true,
        rewrite: path => path.replace(/^\/bridge-api/, ''),
        configure(proxy) {
          proxy.on('proxyReq', request => request.setHeader('Origin', 'http://127.0.0.1:8787'));
        },
      },
    },
  },
});
