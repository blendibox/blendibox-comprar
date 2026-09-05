// Consulta o endpoint de METADADOS de feed da Awin (lista de feeds, não o
// feed de produtos em si) pra saber quando cada feed foi realmente
// atualizado pela última vez — com data E hora, diferente da coluna "Última
// Atualização" que a interface da Awin mostra (só data).
//
// Objetivo: comparar esse horário com o horário do nosso job diário (06:00
// UTC / 03:00 horário de Brasília, ver .github/workflows/deploy.yml) pra
// entender se algum merchant costuma soltar o feed novo DEPOIS do nosso
// fetch — o que explicaria pegar o preço de ontem pra esse merchant
// específico por até 24h, sem que nada esteja "quebrado" no nosso lado.
//
// Só investigação/diagnóstico — não altera nada no pipeline. Rodar
// localmente: definir AWIN_DATAFEED_LIST_KEY no ambiente e
// `node scripts/check-feed-times.mjs`.
//
// Importante: essa é uma chave DIFERENTE da AWIN_API_KEY usada pra baixar o
// feed de produtos em si (fetch-feeds.mjs) — confirmado na prática (a chave
// do feed de produtos dá HTTP 500 nesse endpoint). Pegue a chave certa no
// Create-a-Feed da Awin, gerando/copiando o link de "Product Feed List
// Download" — não o link de download de um feed específico.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'csv-parse/sync'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const API_KEY = process.env.AWIN_DATAFEED_LIST_KEY
if (!API_KEY) {
  throw new Error(
    'Erro: variável de ambiente AWIN_DATAFEED_LIST_KEY não definida.\n' +
      'Defina-a localmente (ex: PowerShell: $env:AWIN_DATAFEED_LIST_KEY = "sua-chave") — ' +
      'é diferente da AWIN_API_KEY usada pro feed de produtos.'
  )
}

// Nomes de coluna exatos não são documentados publicamente (só um exemplo de
// tabela) — acha por substring case-insensitive em vez de assumir grafia
// exata, e cai pra mostrar os headers crus se não achar, em vez de falhar
// silencioso com tudo undefined.
function findKey(headers, ...substrings) {
  return headers.find((h) => substrings.every((s) => h.toLowerCase().includes(s)))
}

async function main() {
  const feedsConfig = JSON.parse(await readFile(path.join(__dirname, 'feeds.config.json'), 'utf-8'))
  const merchantsConfig = JSON.parse(await readFile(path.join(__dirname, 'merchants.config.json'), 'utf-8'))

  // Extrai a lista de fids que a gente realmente baixa hoje direto da URL
  // configurada, em vez de manter essa lista duplicada à mão em outro lugar.
  const fidMatch = feedsConfig.feeds[0].url.match(/\/fid\/([\d,]+)\//)
  const ourFids = new Set((fidMatch?.[1] ?? '').split(','))

  const res = await fetch(`https://productdata.awin.com/datafeed/list/apikey/${API_KEY}`)
  const csv = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status} ao listar feeds da Awin. Corpo da resposta:\n${csv.slice(0, 1000)}`)
  const rows = parse(csv, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true })

  if (!rows.length) {
    console.log('Listagem veio vazia.')
    return
  }

  const headers = Object.keys(rows[0])
  const feedIdKey = findKey(headers, 'feed', 'id')
  const advertiserIdKey = findKey(headers, 'advertiser', 'id')
  const advertiserNameKey = findKey(headers, 'advertiser', 'name')
  const lastImportedKey = findKey(headers, 'last', 'imported')

  console.log(`Colunas encontradas: ${headers.join(' | ')}`)
  if (!feedIdKey || !lastImportedKey) {
    console.log('\nNão consegui identificar as colunas de Feed ID / Last Imported com certeza — ajuste findKey() acima com os nomes reais mostrados.')
    console.log('Primeira linha crua:', rows[0])
    return
  }

  const ours = rows.filter((r) => ourFids.has(String(r[feedIdKey] ?? '')))
  console.log(`\n${ours.length}/${ourFids.size} dos nossos fids encontrados na listagem.\n`)

  // Ordena por horário (mais recente primeiro) pra ver de cara quem atualiza
  // mais tarde no dia.
  ours.sort((a, b) => (a[lastImportedKey] > b[lastImportedKey] ? -1 : 1))

  for (const r of ours) {
    const merchant = advertiserIdKey ? merchantsConfig.merchants[r[advertiserIdKey]] : null
    const name = merchant?.displayName ?? (advertiserNameKey ? r[advertiserNameKey] : '?')
    console.log(`${String(r[lastImportedKey]).padEnd(20)} fid ${String(r[feedIdKey]).padEnd(8)} ${name}`)
  }

  console.log(
    '\nNosso job roda todo dia às 06:00 UTC (03:00 horário de Brasília) — ' +
      'qualquer feed com "Last Imported" depois desse horário só entra no site no dia seguinte.'
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
