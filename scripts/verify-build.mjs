import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const index = path.join(dist, 'index.html');
const server = path.join(dist, 'server.cjs');

const required = [index, server];
const missing = required.filter((file) => !fs.existsSync(file));

if (missing.length) {
  console.error('BUILD_INVALID: arquivos obrigatórios ausentes:');
  for (const file of missing) console.error(`- ${path.relative(root, file)}`);
  process.exit(1);
}

const html = fs.readFileSync(index, 'utf8');
if (!html.includes('<div id="root"></div>')) {
  console.error('BUILD_INVALID: index.html não contém o root da aplicação.');
  process.exit(1);
}

const moduleScripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
for (const src of moduleScripts) {
  if (/^https?:\/\//i.test(src)) continue;
  const normalized = src.replace(/^\.\//, '').replace(/^\//, '');
  const asset = path.join(dist, normalized);
  if (!fs.existsSync(asset)) {
    console.error(`BUILD_INVALID: asset referenciado não encontrado: ${src}`);
    process.exit(1);
  }
}

console.log(`BUILD_VALID: dist contém index.html, server.cjs e ${moduleScripts.length} script(s) local(is).`);
