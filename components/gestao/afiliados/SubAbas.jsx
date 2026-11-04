import Link from 'next/link'

// As sub-abas de Afiliados, na ordem da especificação. Só `pronta` aparece:
// as outras entram na Fase 8, quando ganharem página. Com uma aba só, a barra
// nem é desenhada.
export const SUBABAS = [
  { id: 'dashboard', rotulo: 'Dashboard', href: '/gestao/afiliados/dashboard' },
  { id: 'afiliados', rotulo: 'Afiliados', href: '/gestao/afiliados/lista' },
  { id: 'metas', rotulo: 'Metas e fechamentos', href: '/gestao/afiliados/metas' },
  { id: 'saques', rotulo: 'Saques', href: '/gestao/afiliados/saques', pronta: true },
  { id: 'financeiro', rotulo: 'Financeiro', href: '/gestao/afiliados/financeiro' },
  { id: 'alertas', rotulo: 'Alertas', href: '/gestao/afiliados/alertas' },
  { id: 'config', rotulo: 'Configurações', href: '/gestao/afiliados/configuracoes' },
]

// Aba sublinhada: o fio vermelho de 2 px é o mesmo marcador do menu lateral.
export const classeAba = (ativa) =>
  'relative flex min-h-11 shrink-0 items-center whitespace-nowrap px-3.5 text-[14.5px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink ' +
  (ativa ? 'text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-signal' : 'text-ink-muted hover:text-ink')

export default function SubAbas({ atual }) {
  const prontas = SUBABAS.filter((s) => s.pronta)
  if (prontas.length < 2) return null
  return (
    <nav aria-label="Seções de afiliados" className="-mx-4 mb-5 overflow-x-auto border-b border-line px-1 md:mx-0 md:px-0">
      <ul className="flex">
        {prontas.map((s) => (
          <li key={s.id}>
            <Link href={s.href} prefetch={false} aria-current={s.id === atual ? 'page' : undefined} className={classeAba(s.id === atual)}>
              {s.rotulo}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
