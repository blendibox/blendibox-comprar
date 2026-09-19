import type { ComponentProps } from 'react'
import { Flame, Gift, GraduationCap, Heart, PartyPopper, ShieldCheck, Sparkles, Tag } from './Icon'
import type { SeasonalIconName } from '../lib/seasonalEvents'

// Ícone de cada evento sazonal (a tabela em lib/seasonalEvents.ts guarda só o
// nome, pra ficar puro dado). Ícone novo: importar aqui e no SeasonalIconName.
const ICONS: Record<SeasonalIconName, typeof Tag> = {
  flame: Flame,
  tag: Tag,
  gift: Gift,
  'party-popper': PartyPopper,
  heart: Heart,
  sparkles: Sparkles,
  'shield-check': ShieldCheck,
  'graduation-cap': GraduationCap,
}

export function SeasonalIcon({ name, ...props }: { name: SeasonalIconName } & ComponentProps<typeof Tag>) {
  const Icon = ICONS[name]
  return <Icon {...props} />
}
