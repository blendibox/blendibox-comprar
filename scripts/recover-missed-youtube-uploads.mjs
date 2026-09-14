// Script de uso único — recupera os vídeos diários que não subiram pro
// YouTube entre 31/08 e 14/09/2026 (YOUTUBE_REFRESH_TOKEN expirado nesse
// período, mas o Worker/cron continuou publicando no Telegram normalmente).
// Baixa cada vídeo do link público do CDN da Telegram (achado inspecionando
// a página https://t.me/s/compareofertas — não precisa de bot token) e
// sobe pro YouTube com o mesmo título que generate-daily-video.mjs teria
// gerado (capturado direto da legenda do post no Telegram). A descrição
// original completa (com link por produto) não sobreviveu em lugar nenhum
// acessível — usa uma versão simples, sem inventar produto que não temos
// certeza que estava no vídeo.
//
// Sobe como PRIVATE de propósito (mesmo padrão cauteloso de
// upload-daily-video.mjs) — depois de conferir a qualidade, use
// scripts/set-youtube-privacy.mjs (ou o YouTube Studio) pra tornar público.
//
// Rodar uma vez só: node scripts/recover-missed-youtube-uploads.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { refreshAccessToken } from './lib/youtube-auth-token.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const TMP_DIR = path.join(ROOT, '.recovered-videos')

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN
if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('Erro: defina YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REFRESH_TOKEN no ambiente.')
  process.exit(1)
}

const CATEGORY_ID = '22'
const PRIVACY_STATUS = 'private'
const SITE = 'https://comprar.blendibox.com.br'

// title: exatamente como capturado da legenda do Telegram (mesmo formato
// que buildVideoMetadata() em generate-daily-video.mjs produz).
const MISSED = [
  { date: '31/08/2026', title: '🔥 As 5 Maiores Quedas de Preço de Hoje | 31/08/2026', url: 'https://cdn1.telesco.pe/file/fd10ca467c.mp4?token=qT5RM2vUWKOIN7TU6hWnzEyi2hfEWUI2plz-2yQ_s8kl6lBPBHYE3gDQPL7ZuRJ1XiK4tnwAD-mZCRlplgBC4LEMtKR-c9xP4kSQLDEGOOH4y10hMJcq_x7Ka_tpjh_xr_-8KuOnF7x_YaHCFC0nzG4ad8-pWe6TM3DIqoGPocDWkeq7HcnMXzfF92GnK6fNg9WUNqf-FdTkgPb71GRrJcSAKH2GD5VcrM-xUtxJY7FIsOoH16yAUbvCE-rkMrapeKNRcoAN0Ingwvmy6E0I3h6txCFr2YkgsTffaDN_TctsVfrx7Ogty8eq0JbVFgjzQPO36WqwbxQPIsClJNDN7A' },
  { date: '01/09/2026', title: '🔥 As 5 Maiores Quedas de Preço de Hoje | 01/09/2026', url: 'https://cdn1.telesco.pe/file/7712c79089.mp4?token=DIuJfQwzhYVKoeOY6RSUSXYbDA95DAYVy6AxMyoktU9VW5OiWso7ECSgUo0b7H5hxf_TJitQGCveT6VFzenGEPrQX2pI9_XlPN3NK1EPZmVXY9FGmYwp0JQCefEE4Q0VAyagncjKDrD545vgNh85CHxkpTVNKCJ7-AAGdh21VvdWHiYGjt5przWOHAKzsPxpyAe0i1Tiey6XWwZkbdxeNgnaUuRYuFiRD0RQK0L2CDCGvS_CPiK0uV2ciD-RH02fU36e-zJ1x0RZO4K7_dZmGbDigDSXi9XQq47saE63h56jF8p53Ol-RAJhAm6RVc4255kEN9lcXrmrsUnZWtk96Q' },
  { date: '02/09/2026', title: '🔥 As 5 Maiores Quedas de Preço de Hoje | 02/09/2026', url: 'https://cdn1.telesco.pe/file/e93d13a255.mp4?token=VgJb3lbpPC5ASEL9Hf9E0jl4dFxV18vkXtrxe1QeEfAGessQN-dOox27nKJGf9X-fLOZBkZp9EAZwN-bD3O7iwlewQBtMVIKZwtUzRQSNDOLXoXnw6Ac9yAN8Dpj8pnGCyXxFVNxFci-5OieADVHyPHguUBW_MVYZvLksRiIOfEHRKnFZnBMpmyszhhXoW8A9gQarFv0rZI_OZ0E0sKbcNgWvm7JFVAur--rJpnjbCsLYGJU_ZE_gWdUzFdqrOk3ClY2JpywQ5BMeRM2zpykE-CH62sxfkmXNWcgwL7Q3ThtmQwM9XCfTkwXPqcb36eL0XQrXbI5gDuLYxNQpOHcJg' },
  { date: '03/09/2026', title: '🔥 As 5 Maiores Quedas de Preço de Hoje | 03/09/2026', url: 'https://cdn1.telesco.pe/file/271aeeeeba.mp4?token=VMIrgaVp3IBQLy0lSP0AU_9oOsFia4rZV4jMr7uLOQg2AnM59n6UaMfF6s6UkBN2ramzNtFJDTNJWzPLn7LL3iIj0cQKmbMteaHmhqRnXv6krAaBPaIIwVd6yo9rqLJGgWm-Pf42Geq330x2A2e7QUF1PHVMF9HiyZVFq5a7eJqxYEh7BsKol1AihDb4Hj-Ihip4cC755quTAVhoyz8T3cRJXPEUNEIBSaoPdmQJ0_iAg91J--cAkFeOLMO6i0nbWGs9J8-YHG2aLvfyNKRJ2eDAosd4GjZDemIqnGJfVRXU_MZ6lEd1Nmqgs4XeUvBtYmAW8kY8MpE7owjCmSdTAw' },
  { date: '04/09/2026', title: '🔥 LG BR: as 5 Maiores Quedas de Preço de Hoje | 04/09/2026', url: 'https://cdn1.telesco.pe/file/9329ccb4cb.mp4?token=Do9MBBGS_nnpK9Ce8UaSiHrba1Uc6iu4xEqCfBPYfl5tYSXnUIP25Q95lh9i56SExjUc_PZl-cGEYRAXlYoSuNSU6KpR7XLShP-ubiPsoHtqeemTeLDwcmdJsji5OWRvFkO58j907vn4ZDoSyMnHqeEhp6i8KD4_gC53H9z-HUj3az6NZnRGF1QRSMQXXMG0x8-pt6QZBN4hpXcv8zywsilm6hMPySTySJzMDhvdcdFvZo-RGjjT0cMLsg4StAhoi6L9t7Iy_oR9Or9_JCgqfhxRXLuYEEfwgSUtAxSpjP2QZGjOUNc2MvMeojq69y_a0OcjTiVx-KvzKhGfpZBdyg' },
  { date: '05/09/2026', title: '🔥 As 5 Maiores Quedas de Preço de Hoje | 05/09/2026', url: 'https://cdn1.telesco.pe/file/cabff648ca.mp4?token=Yk7jXrxHl93xhl0G98shtdUreTW5yFYq1fjFE6bap_i_GMrpBMlx6SyhJ65zYrk7b7VdOE25vWwlBFrHK-86wy7uFGbRZFlvtIh0VObMTUjrGqPM33A9E2H19cmFabrjk6Fyg1fjkS-yvvBEaJctyQQXDosW-ra1SLz9uWueIwt9hl8lkPA9X9QR4rGgQbJ3IeuZzTPSD77bbE3ITR-TZRo7b3vwS7W0ofVR8EI7bIR6BFFk4NqKWcgpfJzOKY_5Snqr3p9D0moXu4seAiaabZTc-I0v-wjtX6PQQS5SuC3gVKWr51_kqNb7JkmTpHa9FjjXn9LnIWEeJQVm6sSZIA' },
  { date: '06/09/2026', title: '🔥 Centauro BR: as 5 Maiores Quedas de Preço de Hoje | 06/09/2026', url: 'https://cdn1.telesco.pe/file/9bb263160e.mp4?token=Z_OYxk1FOznAzlBT3mhQBJsAYjSRH5anwFDGmY347dP_rNiYkVkVYfgB_xWB_9SM2Q9UHAfp38_OYzkS7HxqrGVH3vLxNNGh6Mo52Zn91V2QjD9ECDu_rdrhOpP2HCh6MHgQz8xqt2NJd_-nSZdzpjUnbKTxY7rKzvDUDWbwCb9l9uFgifB3EIDhoP6LpYf3mrspT0XP4Fnb3UQ9JOf_3d7aje9hGL3RTKWi6LGZcs80hu3FHDhLLMp3P4gF90DdJYbuQU6ZaUjvylo8OIq280j_DvCAaFJuvDP1JouRWbiFMdz2Php6aQRMBKa7j_Z03sJQNqqkckZhJ1TlP5MsOg' },
  { date: '07/09/2026', title: '🔥 As 5 Maiores Quedas de Preço de Hoje | 07/09/2026', url: 'https://cdn1.telesco.pe/file/134673cd4e.mp4?token=ZFiHPiuDcjQrpaD4kiD4dBKF3t1ryAqKYiuEOqDj9iI8y2cK0bX_tXnfSitCkP029C2oAaFrwbmzClIJpVR9Ej9VOC0JduPuxKVsHvWgwQDa_oW-Z3YGF3D3aTxs9d-Efh5ru4G2DRr50FTETkbEfhzSKYlIaYgVanB1ikxExErBWBfl2AZoIVkq9zOzYux_WZcqkCdDybiZqsD6cFWV9FoU1TpEzlhyKT8PR7IDiMBWF6Ilb4Q8YzKQDgJca7Yjb1QFrhEW0IrESmfScWiee9xIoDqvEVwN50Q0KltY-HsfXgHpeTnRiW-Atz-i5_IR2DjAB5nZ2S6ulvs0dgdEcg' },
  { date: '08/09/2026', title: '🔥 As 5 Maiores Quedas de Preço de Hoje | 08/09/2026', url: 'https://cdn1.telesco.pe/file/8794a2909d.mp4?token=m2tBDkl5XlvtXWM2QMlkyryh-MC08AgL3o6CmHMoKoD6WX9LfFvVQJpTK51hzKPw3L-citZQyXvrukk6Pv5HeXyMUj2J7LisOAgiEYdpIfu46rIZkdFaB6RAKSeazy7ZX1XASlg1Ka2UuuW0FPc_fH-WigLKOsEDthJAtDdkXmj-7vIMlFxtefswX5wDP9BhdK4sJ-ho6xrAGKhRnenei5l7tJOentKdlp9-L8AQKv0nwytqwzkah4sLPIHeIYBxhCKbed-Is8BeJIjuNaVQh_jK4qvl35Dewj72c49EgJBB34m-gDiW1as7_l4ovD97DAiai7Zti9kZVm2GRlFVaQ' },
  { date: '09/09/2026', title: '🔥 Kabum BR: as 5 Maiores Quedas de Preço de Hoje | 09/09/2026', url: 'https://cdn1.telesco.pe/file/34b07322bd.mp4?token=TeF6NDkXRcqlDayH_Y9WuSMnTBhTJ3RW5MXEqcr3KoSgon5EpNr6ITF8orFbpB7aWI4xv9aLU0TTvVLBbivLuTQxpYr7AUMf4f6b-LzQaHtxUKBxrqF-ymXAC8rBRlHX0DS-2pKCYUGD_gV5f0qf_pMS2jn5PW_70uALSu6SRbm9TpXH_F_SG5pxjcpiwKHSpRA45aFOYbBPZ8HGZGj2VFJ9gjwbhSqNNoFHt7UMA0NMwt-xaz3eArCU1MEk7PQ7cUBaQ211jiMCxN6AX9eK64W93_fqBeiqmtcJAqaP8ZkfukouHD_0YIEMR9gklHz9olet7Myxn90c1N4lnH3kBQ' },
  { date: '10/09/2026', title: '🔥 As 5 Maiores Quedas de Preço de Hoje | 10/09/2026', url: 'https://cdn1.telesco.pe/file/ba4bfb2962.mp4?token=e7mDCBzVBOOWAltD-cXVBjbTT1GDn3sbjBZcuk9wwqtdATXwCqaOnvjRsX_AKDfDs5W31Q47jk5IoXkhI2E2vifbx-1c-tfI-pZRm6UxWg10u5jUIrC-dT-Rd8ldcsirNt3Ci2Gh4PKGbglngCeEHwY-By2Persps4X6VwLP5Kb9_RR6rL5NBQq6HzCDk5GQ3uHR8jpaFEUOISFnPzu-V3ihiYXrop44lbtQIymyOAm5-nA2z-JvdQRVUJSa5BoTQW-LhlZUzW0KTedwCbAKdNOr8On8VSgtdk51lF7Flo-WCnjKX68vOPdR3reeXnwjeuO9TlVMRdLmhe-zLhb8qQ' },
  { date: '11/09/2026', title: '🔥 Kabum BR: as 5 Maiores Quedas de Preço de Hoje | 11/09/2026', url: 'https://cdn1.telesco.pe/file/918f29f65a.mp4?token=iLI6DbVEFWeEaxAM2YyWXlESFUyw7bQqRQ0JTf7_luQbWFDjcJWHZyz3mGlw1HRK5yUMvP1IynhpBgOl6SQK0VhU9kZ87b0_7z8sYodlbiBHxy4xTD541ZFHLKQO1dHFzBkjF8rRDxTGmzaQyVEBESPMU2MMGGIuFoI8mqfqEzfRyZWcKPcvVQMQazR4sMENmArzkoLwMPfDWAfmEO-Ov8hYJB-Deap_StskFYCODTOgZYWkgcr12zLmSyTXJlrAGSPjSa7-xUFvDEKcxRgDNUaypBFUqEUfn0MfBzys4sWJg--XNGLc8KDQB5GihGucbYk9ljcTcolQ63ir_S3Uig' },
  { date: '12/09/2026', title: '🔥 Kabum BR: as 5 Maiores Quedas de Preço de Hoje | 12/09/2026', url: 'https://cdn1.telesco.pe/file/e530712d15.mp4?token=JtoRB8dY-_aBUVD8IJNO6LnGLlZB_llPkrgUoJ4U7Jvq9LdHrFaEdQbxQ6XdVZZQOEg9AJsiJa9IzPefRcswSNtO1b_LsfdQSJCADlsP2yon0y1iwCs8kaTCQPNGVxiuIHfAy400lA-SlQVeQCKMT5SQqhMxBwOL0rTRnutGpai35Art0udvlDkvpJWZnQNRjTJTLwX2gQttKXzby6sGH4hdi-E5TrxZADF2OPxGmMDaffuYL7cUv5PxIS4ynmGbT4PawG8dxK02rTkMxRr8qXTgFzr7KycryAxE8sWxOyqd89gBIBaqQfqWZ5sONNM2CaOmjug2EsamAel3JSftLQ' },
  { date: '13/09/2026', title: '🔥 As 5 Maiores Quedas de Preço de Hoje | 13/09/2026', url: 'https://cdn1.telesco.pe/file/7375bd79dc.mp4?token=QkmwWF997wr09rVq3GWbHnb4GFX_eRA_yRtIFlSv2X-STHHsFRFnGia0mjPtg-ow1SVyrLkHXxfI9ly6bqrX97hpoX_6tQwAoNVhific5gU79YHnJlOVZd5EXreoc357om_JtIpRVkYr7SvcXIqDbfJSvrc8I7uAzy_enIO5b-YNzaWlkKm2Z4tYFG8Qs1bBVJATnSUyw0NaMeM2YKUMnl7C8b0fpdah2RfzN8pQRsL7XvDLA4nDDktGWgUBUY-G39CRLlfmCn8ti5Xmz8JNKLFZlq2bH82BTFLmnUJlcjcyYfdKs1iK02aV7A_PDIpQKn05EP7VQIUCxOBMvXluHQ' },
  { date: '14/09/2026', title: '🔥 Kabum BR: as 5 Maiores Quedas de Preço de Hoje | 14/09/2026', url: 'https://cdn1.telesco.pe/file/36a7f358d6.mp4?token=GdNQHKJRzMRQJ3tEylWek7zc3uWhYtrEG_i_6qLpMpZsIl2RQjpRjJo1M23lllhL0jGWZpMuDE0td7EdS-WRqmZUThsZ3kuUoq7dosZRCgRWFr29EhSp0vgaIbo2eMj8jaWKiToR5CdT_P2eiq6jNb8drehujEt5dl3KcqYQlC5UPDAZzktXz5Lrj-SfO1XR6noJcq-n_aaxhMbZ3G8g_Jc8233ZNYLKxKYAqATQIFVsBtw1Tdoyl28B4UnWtdJsuam2LHcIgQWb4S5THsFnelqEqMCYi-_w0NuR56icmm-QCPSs0wOyqtulWAexdTxLawZYr0iiZEUs0NFeD4IWAA' },
]

function buildDescription(date) {
  return `🔥 Confira as maiores quedas de preço encontradas em ${date} pelo Compare Ofertas.

🔎 Compare preços: ${SITE}
🎁 Lista de presentes: ${SITE}/lista-de-presentes
🎟️ Cupons oficiais: ${SITE}/cupons

⚠️ Contém links de afiliado.

#ofertas #promocao #desconto #precobaixo`
}

async function uploadVideo({ accessToken, videoBuffer, title, description }) {
  const metadata = {
    snippet: { title, description, tags: ['ofertas', 'promocao', 'desconto', 'precobaixo'], categoryId: CATEGORY_ID },
    status: { privacyStatus: PRIVACY_STATUS, selfDeclaredMadeForKids: false },
  }
  const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Upload-Content-Type': 'video/mp4',
      'X-Upload-Content-Length': String(videoBuffer.length),
    },
    body: JSON.stringify(metadata),
  })
  if (!initRes.ok) throw new Error(`Falha iniciando upload: ${initRes.status} ${await initRes.text()}`)
  const uploadUrl = initRes.headers.get('location')
  if (!uploadUrl) throw new Error('Resposta sem "location" header.')

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(videoBuffer.length) },
    body: videoBuffer,
  })
  if (!putRes.ok) throw new Error(`Falha enviando o vídeo: ${putRes.status} ${await putRes.text()}`)
  return putRes.json()
}

async function main() {
  await mkdir(TMP_DIR, { recursive: true })
  console.log(`Renovando access token...`)
  const accessToken = await refreshAccessToken({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, refreshToken: REFRESH_TOKEN })
  console.log('OK — token válido.\n')

  const results = []
  for (const item of MISSED) {
    console.log(`[${item.date}] baixando do Telegram...`)
    const res = await fetch(item.url)
    if (!res.ok) {
      console.error(`  [erro] falha baixando: HTTP ${res.status}`)
      results.push({ ...item, error: `download HTTP ${res.status}` })
      continue
    }
    const videoBuffer = Buffer.from(await res.arrayBuffer())
    await writeFile(path.join(TMP_DIR, `${item.date.replace(/\//g, '-')}.mp4`), videoBuffer)

    console.log(`  (${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB) enviando pro YouTube: "${item.title}"...`)
    try {
      const result = await uploadVideo({
        accessToken,
        videoBuffer,
        title: item.title,
        description: buildDescription(item.date),
      })
      console.log(`  ✅ https://youtu.be/${result.id}`)
      results.push({ ...item, youtubeId: result.id, youtubeUrl: `https://youtu.be/${result.id}` })
    } catch (err) {
      console.error(`  [erro] falha no upload: ${err.message}`)
      results.push({ ...item, error: err.message })
    }
  }

  await writeFile(path.join(TMP_DIR, 'results.json'), JSON.stringify(results, null, 2))
  const ok = results.filter((r) => r.youtubeId).length
  console.log(`\n${ok}/${MISSED.length} vídeos recuperados e enviados como PRIVATE. Resultado completo em ${path.join(TMP_DIR, 'results.json')}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
