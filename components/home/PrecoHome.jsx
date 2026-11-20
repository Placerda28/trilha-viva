'use client'

import BlocoPreco from '@/components/BlocoPreco'
import { useUsuario } from '@/components/usuario'

// BlocoPreco (fase 1) com o estado real de quem olha: quem já tem o pacote vê
// "As 2.000 VS já são suas." e o botão "Abrir Minhas VS". `palco` e `lancamento`
// chegam do servidor (lib/palco.js lê process.env só lá).
export default function PrecoHome({ palco, lancamento }) {
  const usuario = useUsuario()
  return <BlocoPreco usuario={usuario} palco={palco} lancamento={lancamento} />
}
