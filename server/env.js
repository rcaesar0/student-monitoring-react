import fs from 'node:fs';
import path from 'node:path';

// Reads a .env file (KEY=value per line) and merges it with the real environment.
export function loadEnv(root = process.cwd()) {
  const env = { ...process.env };
  try {
    fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m && !line.trim().startsWith('#') && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  } catch { /* no .env file */ }
  return env;
}   