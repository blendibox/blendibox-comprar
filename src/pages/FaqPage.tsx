import faqItems from '../data/faq.json'

// Conteúdo em texto puro (não só JSON-LD) de propósito — robôs de busca e
// IAs (GPTBot, ClaudeBot, PerplexityBot etc.) entendem melhor texto visível
// na página do que só dado estruturado escondido num <script>.
export function FaqPage() {
  return (
    <div className="page legal-page">
      <header className="page__header">
        <h1>Perguntas frequentes</h1>
      </header>
      <section className="faq-list">
        {faqItems.map((item) => (
          <div key={item.question} className="faq-item">
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
