import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
let html = await readFile(resolve(root, 'dist/index.html'), 'utf8');
const scriptPath = html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)?.[1];
const stylePath = html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)?.[1];
if (!scriptPath || !stylePath) throw new Error('Сначала выполните npm run build');

const script = await readFile(resolve(root, `dist${scriptPath}`), 'utf8');
const style = await readFile(resolve(root, `dist${stylePath}`), 'utf8');
html = html
  .replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/, () => `<script type="module">${script.replaceAll('</script>', '<\\/script>')}</script>`)
  .replace(/<link[^>]+href="[^"]+\.css"[^>]*>/, () => `<style>${style}</style>`)
  .replace(/<link rel="manifest"[^>]*>/, '');

await writeFile(resolve(root, 'dist/planer.html'), html);
console.log('Автономная версия: dist/planer.html');
