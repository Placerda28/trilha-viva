// Ícones do site: desenho Lucide (traço 1,5 a 1,75), em SVG inline.
//
// Sem a biblioteca lucide-react de propósito: o site usa 25 ícones, e a lib
// inteira (ou o bundler descartando o resto) custa mais do que as linhas abaixo.
// Para ícone novo, copie o desenho de https://lucide.dev (ISC) para o mapa.
// Cor sempre `currentColor`: quem decide a cor é o texto em volta.
const P = (d) => <path d={d} />

const DESENHOS = {
  usuario: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  menu: (
    <>
      <line x1="4" x2="20" y1="7" y2="7" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="17" y2="17" />
    </>
  ),
  fechar: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  cadeado: (
    <>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  'seta-direita': P('m9 18 6-6-6-6'),
  'seta-baixo': P('m6 9 6 6 6-6'),
  alerta: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  check: P('M20 6 9 17l-5-5'),
  inbox: (
    <>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  recarregar: (
    <>
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
  carregando: P('M21 12a9 9 0 1 1-6.219-8.56'),
  instagram: (
    <>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </>
  ),
  email: (
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  sair: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </>
  ),
  casa: P('M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z'),
  musica: P('M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'),
  recibo: P('M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2zM8 8h8M8 12h8M8 16h5'),
  baixar: P('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3'),
  cartao: P('M2 5h20v14H2zM2 10h20'),
  monitor: P('M2 3h20v14H2zM8 21h8M12 17v4'),
  pessoa: P('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'),
  moeda: P('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM8 14l4-4 4 4'),
  ajuda: P('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01'),
  palco: P('M2 10v3M6 6v11M10 3v18M14 8v7M18 5v13M22 10v3'),
}

// Ícones cheios (play e pausa do player): sem traço, preenchidos com currentColor.
const CHEIOS = {
  play: <path d="M7 4.5v15l12-7.5z" />,
  pausa: (
    <>
      <rect x="6" y="4.5" width="4" height="15" />
      <rect x="14" y="4.5" width="4" height="15" />
    </>
  ),
}

export function Icone({ nome, tamanho = 20, traco = 1.75, className = '' }) {
  const cheio = CHEIOS[nome]
  const desenho = cheio || DESENHOS[nome]
  if (!desenho) return null
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill={cheio ? 'currentColor' : 'none'}
      stroke={cheio ? 'none' : 'currentColor'}
      strokeWidth={traco}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {desenho}
    </svg>
  )
}

export const ICONES_DISPONIVEIS = [...Object.keys(DESENHOS), ...Object.keys(CHEIOS)]
