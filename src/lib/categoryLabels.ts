// Contraparte client-side de CATEGORY_SLUG_LABELS em scripts/prerender.mjs
// (aquele é Node-only, não dá pra importar direto no bundle do site) —
// mesma tabela, mantida em sincronia manualmente se a lista mudar. Cobre só
// os slugs de categoria que vêm em inglês hoje (taxonomia Google Product
// Category — hoje só a LG usa isso, feed pago em dólar). Categorias que já
// vêm em português do próprio feed não precisam de entrada aqui: o slug
// (com hífen no lugar de espaço) já é um rótulo legível.
const CATEGORY_SLUG_LABELS: Record<string, string> = {
  speakers: 'Caixas de Som',
  'computer-accessories': 'Acessórios de Informática',
  'computer-monitors': 'Monitores',
  projectors: 'Projetores',
  televisions: 'TVs',
  'computer-monitor-accessories': 'Acessórios para Monitores',
  'climate-control-appliances': 'Ar-Condicionado',
  'air-conditioners': 'Ar-Condicionado Residencial',
  'washing-machines': 'Lavanderia',
  cookware: 'Panelas',
  'kitchen-appliances': 'Eletrodomésticos de Cozinha',
}

export function categoryHubLabel(categorySlug: string): string {
  return CATEGORY_SLUG_LABELS[categorySlug] ?? categorySlug.replace(/-/g, ' ')
}
