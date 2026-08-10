// Barra de progresso da lista de presentes — reforça a percepção de "fluxo
// guiado" (criar → adicionar → compartilhar) em vez de "formulário/cadastro".
const STEPS = ['Informações', 'Presentes', 'Compartilhar']

export function RegistrySteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="registry-steps" aria-label="Progresso da lista">
      {STEPS.map((label, i) => {
        const n = i + 1
        const state = n < current ? 'done' : n === current ? 'current' : 'todo'
        return (
          <li key={label} className={`registry-steps__item registry-steps__item--${state}`}>
            <span className="registry-steps__num">{n}</span>
            <span className="registry-steps__label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
