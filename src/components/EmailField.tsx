import { useState, type FocusEvent, type InputHTMLAttributes } from 'react'
import { suggestEmailCorrection } from '../lib/emailSuggestion'

interface EmailFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: string
  onChange: (value: string) => void
}

// Substitui <input type="email" value={} onChange={(e) => setX(e.target.value)} />
// nos formulários do site — mesma ideia, só que onChange já recebe a string
// (não o evento). Ao sair do campo, sugere corrigir erro de digitação comum
// no domínio ("hotmal.com" -> "hotmail.com"), sem bloquear o envio (é
// heurística, ver src/lib/emailSuggestion.ts). Renderiza como <span> com
// position:relative pra a sugestão flutuar por baixo do campo (position:
// absolute) sem interferir no layout de quem envolve — funciona igual dentro
// de linha com ícone, label empilhado ou formulário simples.
export function EmailField({ value, onChange, onBlur, className, ...rest }: EmailFieldProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null)

  function handleBlur(e: FocusEvent<HTMLInputElement>) {
    setSuggestion(suggestEmailCorrection(e.target.value))
    onBlur?.(e)
  }

  function acceptSuggestion() {
    if (!suggestion) return
    onChange(suggestion)
    setSuggestion(null)
  }

  return (
    <span className="email-field">
      <input
        type="email"
        value={value}
        className={className}
        onChange={(e) => {
          onChange(e.target.value)
          if (suggestion) setSuggestion(null)
        }}
        onBlur={handleBlur}
        {...rest}
      />
      {suggestion && (
        <button type="button" className="email-field__suggestion" onMouseDown={(e) => e.preventDefault()} onClick={acceptSuggestion}>
          {`Você quis dizer ${suggestion}?`}
        </button>
      )}
    </span>
  )
}
