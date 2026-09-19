// Carrega a regra de queda de preço (src/lib/priceDrop.ts — TypeScript puro, o
// mesmo arquivo que o site pode importar) compilando na hora com o esbuild que o
// build já usa. Mesma técnica de scripts/lib/seasonal.mjs.
import { build } from 'esbuild'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

let modulePromise
export function loadPriceDrop() {
  modulePromise ??= build({
    entryPoints: [path.join(ROOT, 'src', 'lib', 'priceDrop.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    absWorkingDir: ROOT,
    logLevel: 'silent',
  }).then((result) => {
    // Só tem import de tipo (apagado na compilação): data: URL, sem arquivo temporário
    const source = Buffer.from(result.outputFiles[0].text).toString('base64')
    return import(`data:text/javascript;base64,${source}`)
  })
  return modulePromise
}
