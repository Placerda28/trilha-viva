import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Junta classes condicionais (clsx) e resolve conflitos do Tailwind (twMerge),
 * para quem usa o componente conseguir sobrescrever uma classe passando a dela:
 * `<Button className="px-3">` ganha do `px-7` da variante em vez de brigar.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
