// URL canônica de produção — usada só pra montar links absolutos no cliente
// (compartilhamento, etc.). O prerender já grava o <link rel="canonical">
// certo em cada página; isso aqui é só pra features client-side.
export const SITE_URL = 'https://comprar.blendibox.com.br'

// Canais oficiais reais (ver scripts/post-telegram-deals.mjs,
// scripts/post-telegram-video.mjs e scripts/upload-daily-video.mjs) —
// mesmo canal/conta que o pipeline diário publica, não um placeholder.
export const TELEGRAM_URL = 'https://t.me/compareofertas'
export const YOUTUBE_URL = 'https://www.youtube.com/channel/UC10DlWnpKFkV6Yiv8ljuxrA'
