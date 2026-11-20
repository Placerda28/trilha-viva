'use client'

import Link from 'next/link'
import { Icone } from '@/components/ds'
import { useUsuario } from '@/components/usuario'

// Rodapé do quadro "Pacote 2.000 VS" da vitrine do Palco. A página é estática e
// não sabe quem olha: quem tem o pacote vê "Você já tem"; os outros, o link.
export default function PacoteAcao() {
  if (useUsuario() === 'com-pacote') {
    return (
      <p className="mt-auto flex items-center gap-2 text-[15px] font-[650]">
        <Icone nome="check" tamanho={18} traco={2} />
        Você já tem
      </p>
    )
  }
  return (
    <Link
      href="/assinar"
      className="mt-auto inline-flex min-h-11 items-center self-start text-[16px] font-semibold text-ink underline underline-offset-4 hover:decoration-2"
    >
      Liberar as 2.000 VS
    </Link>
  )
}
