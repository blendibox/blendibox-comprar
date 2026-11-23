// Roda no workflow quando o feed da Awin NÃO pôde ser usado (scripts/fetch-feeds.mjs
// deixou .feed-unavailable.json) e o build vai reaproveitar o último catálogo,
// restaurado do cache do GitHub Actions em public/data.
//
// Decide se esse catálogo ainda é recente o bastante pra publicar: "site velho e
// completo" ganha de "site nenhum", mas não indefinidamente — passou do limite
// (FEED_FALLBACK_MAX_DAYS, 7 por padrão), o passo FALHA de propósito pra alguém
// olhar, em vez de publicar preços de semanas atrás como se fossem de hoje.
//
// A data do catálogo vem de public/data/meta.json (generatedAt), que o
// build:no-fetch NÃO reescreve — então ela continua sendo a do último feed
// realmente baixado, mesmo depois de vários builds seguidos em modo fallback
// (o limite conta a partir do feed real, não do último deploy). É também o que o
// rodapé do site mostra em "Atualizado há X h": fica honesto sozinho.
//
// Em caso de sucesso deixa .feed-fallback.json (lido pelo e-mail de aviso).
import { readFile, writeFile } from 'node:fs/promises'

const META_PATH = process.env.META_PATH || 'public/data/meta.json'
const UNAVAILABLE_PATH = process.env.FEED_UNAVAILABLE_FLAG || '.feed-unavailable.json'
const FALLBACK_PATH = process.env.FEED_FALLBACK_FLAG || '.feed-fallback.json'
const MAX_DAYS = Number(process.env.FEED_FALLBACK_MAX_DAYS || 7)

const oneLine = (text) => String(text).replace(/\s+/g, ' ').trim()

const unavailable = await readFile(UNAVAILABLE_PATH, 'utf-8').then(JSON.parse).catch(() => null)
const reason = oneLine(unavailable?.reason || 'motivo não registrado')

const meta = await readFile(META_PATH, 'utf-8').then(JSON.parse).catch(() => null)
const generatedMs = Date.parse(meta?.generatedAt)
if (!Number.isFinite(generatedMs)) {
  console.log(
    `::error title=Feed da Awin indisponível::não há catálogo anterior utilizável (meta.json ausente ou sem generatedAt) — não publico às cegas. Feed: ${reason}`
  )
  process.exit(1)
}

const ageHours = (Date.now() - generatedMs) / 3_600_000
const catalogDate = new Date(generatedMs).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

if (ageHours > MAX_DAYS * 24) {
  console.log(
    `::error title=Feed da Awin indisponível::o último catálogo é de ${catalogDate} (${(ageHours / 24).toFixed(1)} dias, limite ${MAX_DAYS}) — build falhou de propósito pra não publicar preços velhos demais. Feed: ${reason}`
  )
  process.exit(1)
}

await writeFile(
  FALLBACK_PATH,
  JSON.stringify({ reason, catalogGeneratedAt: new Date(generatedMs).toISOString(), ageHours: Math.round(ageHours), maxDays: MAX_DAYS })
)
console.log(
  `::warning title=Feed da Awin indisponível::publicando com o catálogo de ${catalogDate} (${Math.round(ageHours)} h atrás; limite ${MAX_DAYS} dias). Preços e estoque podem estar defasados. Feed: ${reason}`
)
