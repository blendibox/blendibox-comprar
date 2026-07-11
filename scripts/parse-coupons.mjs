// Feed de promoções/cupons da Awin não tem link de download direto (diferente
// do feed de produtos) — o usuário exporta manualmente do painel Awin e
// substitui data/promotions.csv no repo quando quiser atualizar. Esse script
// roda em todo build (push já republica), filtra o que expirou e resolve
// merchantSlug/vertical pelo mesmo merchants.config.json usado no feed de produtos.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse/sync'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUTPUT_DIR = path.join(ROOT, 'public', 'data')

async function fileExists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

// Datas vêm como "DD/MM/YYYY HH:mm:ss" (formato BR) — Date() nativo do JS
// interpretaria errado (tenta MM/DD).
function parseBrDate(value) {
  const m = String(value ?? '').match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (!m) return null
  const [, day, month, year, hour, minute, second] = m
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
}

async function main() {
  const csvPath = path.join(ROOT, 'data', 'promotions.csv')
  if (!(await fileExists(csvPath))) {
    console.log('data/promotions.csv não existe — build segue sem cupons.')
    await mkdir(OUTPUT_DIR, { recursive: true })
    await writeFile(path.join(OUTPUT_DIR, 'coupons.json'), '[]')
    return
  }

  const merchantsConfig = JSON.parse(await readFile(path.join(__dirname, 'merchants.config.json'), 'utf-8'))

  const raw = await readFile(csvPath, 'utf-8')
  const rows = parse(raw, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true })

  const now = new Date()
  const coupons = []
  let expiredCount = 0

  for (const row of rows) {
    const ends = parseBrDate(row['Ends'])
    if (ends && ends < now) {
      expiredCount++
      continue
    }

    const advertiserId = row['Advertiser ID']
    const merchant = merchantsConfig.merchants[advertiserId]

    coupons.push({
      id: row['Promotion ID'],
      advertiser: row['Advertiser'],
      merchantSlug: merchant?.slug ?? null,
      vertical: merchant?.vertical ?? null,
      type: row['Type'],
      isVoucher: Boolean(row['Code']?.trim()),
      code: row['Code']?.trim() || null,
      title: row['Title'] || row['Description'],
      description: row['Description'],
      starts: row['Starts'],
      ends: row['Ends'],
      deeplink: row['Deeplink Tracking'] || row['Deeplink'],
    })
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  await writeFile(path.join(OUTPUT_DIR, 'coupons.json'), JSON.stringify(coupons))

  console.log(`Cupons: ${coupons.length} ativos gravados (${expiredCount} expirados ignorados, ${rows.length} no total).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
