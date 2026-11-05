import { corDoNivel } from './painelUtil'

// O selo do nível: um quadradinho na cor do nível e o nome ao lado. É um dos
// dois lugares onde bronze, prata e ouro aparecem (o outro é o gráfico de
// distribuição por nível). O nome sempre vai escrito: a cor sozinha não conta.
export default function Selo({ nome, posicao = 0, className = '' }) {
  return (
    <span className={'inline-flex items-center gap-2 ' + className}>
      <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: corDoNivel(nome, posicao) }} />
      <span>{nome}</span>
    </span>
  )
}
