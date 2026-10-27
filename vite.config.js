import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createSharedDb } from './server/sharedDb.js';
import { createVerifier } from './server/verify.js';

// The shared database and the verification service run inside the dev server, so every device that opens the app
// from this computer reads and writes the same data (server-data/db.json). For real use see server/start.js.
function schoolApi(env) {
  const db = createSharedDb(process.cwd());
  const verify = createVerifier(env);
  // Must return nothing: Vite treats a returned value as a function to call after its own middlewares.
  const attach = (server) => {
    server.middlewares.use('/api/db', db);
    server.middlewares.use('/api/verify', verify);
  };
  return { name: 'school-api', configureServer: attach, configurePreviewServer: attach };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); // also reads the .env file
  return {
    plugins: [react(), schoolApi(env)],
    server: { host: true, port: 5173, open: true, watch: { ignored: ['**/server-data/**'] } },
  };
});