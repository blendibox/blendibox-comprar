import type { FaqItem } from '../types/product'

// Perguntas e respostas geradas dos dados (src/lib/priceInsights.ts). Texto
// sempre visível — o mesmo que vai no JSON-LD FAQPage do prerender — sem estado
// nem "agora", então servidor e cliente renderizam igual.
export function FaqBlock({ title, items }: { title: string; items: FaqItem[] }) {
  if (items.length === 0) return null
  return (
    <section className="faq-auto" aria-label={title}>
      <h2>{title}</h2>
      {items.map((item) => (
        <div className="faq-auto__item" key={item.question}>
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
        </div>
      ))}
    </section>
  )
}
