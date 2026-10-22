import Link from 'next/link'

// Texto dos artigos com duas marcações simples, sem HTML cru:
//   [texto](/caminho)  link interno (só endereço que começa com "/")
//   **texto**          negrito
const MARCA = /\[([^\]]+)\]\((\/[^)\s]*)\)|\*\*([^*]+)\*\*/g

export default function Texto({ children }) {
  const s = String(children ?? '')
  const partes = []
  let ultimo = 0
  for (const m of s.matchAll(MARCA)) {
    if (m.index > ultimo) partes.push(s.slice(ultimo, m.index))
    partes.push(
      m[1] ? (
        <Link key={m.index} href={m[2]}>
          {m[1]}
        </Link>
      ) : (
        // O negrito pode ter link dentro: "**[Música](/musicas/x)**".
        <strong key={m.index}>
          <Texto>{m[3]}</Texto>
        </strong>
      )
    )
    ultimo = m.index + m[0].length
  }
  if (ultimo < s.length) partes.push(s.slice(ultimo))
  return partes
}

// Mesmo texto sem as marcações, para o JSON-LD e para a busca.
export const textoPuro = (s) => String(s ?? '').replace(MARCA, (_, t, __, b) => t || b)
