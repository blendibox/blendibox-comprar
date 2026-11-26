import { useSyncExternalStore } from 'react'
import { COUNTDOWN_WINDOW_MS, countdownText } from '../../lib/coupons'
import { daysUntilBrDate, formatBrDate, formatBrDateTime, parseBrDate } from '../../lib/date'
import { Clock } from '../Icon'

// Um único relógio de 1 segundo pra página toda: só os contadores se redesenham,
// e ele para quando não sobra nenhum na tela.
let currentTime = 0
let timer: number | undefined
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (timer === undefined) {
    currentTime = Date.now()
    timer = window.setInterval(() => {
      currentTime = Date.now()
      listeners.forEach((notify) => notify())
    }, 1000)
  }
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      window.clearInterval(timer)
      timer = undefined
      currentTime = 0
    }
  }
}

const getTime = () => currentTime || (currentTime = Date.now())
const getServerTime = () => 0

function Countdown({ ends, endsAt }: { ends: string; endsAt: number }) {
  const time = useSyncExternalStore(subscribe, getTime, getServerTime)
  const left = endsAt - time
  return (
    // sem aria-live: um leitor de tela não pode anunciar a cada segundo
    <span className="coupons-countdown" role="timer" aria-live="off" title={`Vence em ${formatBrDateTime(ends)} (horário de Brasília)`}>
      <Clock size={13} aria-hidden="true" />
      {left > 0 ? (
        <>
          Termina em <strong>{countdownText(left)}</strong>
        </>
      ) : (
        <strong>Expirou agora</strong>
      )}
    </span>
  )
}

// "Vale até 30/11/2026 (expira em 4 dias)" e, nas últimas 48h, o contador
// regressivo. Contagem e contador só depois de montar (`now`): o HTML estático
// não pode depender do relógio.
export function CouponValidity({ ends, now, prefix }: { ends: string; now: Date | null; prefix?: string }) {
  const validUntil = formatBrDate(ends)
  const endsAt = parseBrDate(ends)?.getTime()
  const days = now ? daysUntilBrDate(ends, now) : null
  const countingDown = Boolean(now && endsAt && days != null && endsAt - now.getTime() <= COUNTDOWN_WINDOW_MS)
  const label = [prefix, validUntil && `${prefix ? 'vale' : 'Vale'} até ${validUntil}`].filter(Boolean).join(' · ')

  return (
    <div className="coupons-validity">
      {label && <span>{countingDown || days == null ? label : `${label} (expira em ${days} dias)`}</span>}
      {countingDown && <Countdown ends={ends} endsAt={endsAt!} />}
    </div>
  )
}
