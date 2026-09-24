// Os estados que toda tela de gestão precisa: carregando, erro, vazio e a
// troca de página.

export function Aviso({ erro, onTentar }) {
  if (erro === 'sessao') {
    return (
      <div role="alert" className="mt-6 rounded border border-line bg-white px-5 py-5">
        <p className="text-[15px] font-semibold text-ink">Sua sessão acabou</p>
        <p className="mt-1 text-[14.5px] text-ink-muted">Entre de novo para continuar na gestão.</p>
        <a href="/entrar" className="btn-ink mt-4 !px-5 !py-3 !text-[14.5px]">
          Entrar
        </a>
      </div>
    )
  }
  return (
    <div
      role="alert"
      className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded border border-signal/40 bg-white px-5 py-4"
    >
      <p className="text-[14.5px] text-ink">{erro}</p>
      <button type="button" onClick={onTentar} className="btn-quiet !px-4 !py-2.5 !text-[14px]">
        Tentar de novo
      </button>
    </div>
  )
}

// Linhas cinza no lugar da tabela enquanto os dados chegam: a tela não pula
// quando eles aparecem.
export function Esqueleto({ linhas = 6 }) {
  return (
    <div aria-hidden="true" className="mt-6 divide-y divide-line rounded border border-line bg-white">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/5 rounded-sm bg-mist" />
            <div className="h-3 w-3/5 rounded-sm bg-mist/70" />
          </div>
          <div className="h-3.5 w-16 rounded-sm bg-mist" />
        </div>
      ))}
    </div>
  )
}

export function Vazio({ titulo, texto }) {
  return (
    <div className="mt-6 rounded border border-dashed border-mist-deep bg-white px-5 py-10 text-center">
      <p className="text-[15.5px] font-semibold text-ink">{titulo}</p>
      {texto && <p className="mx-auto mt-2 max-w-text text-[14.5px] text-ink-muted">{texto}</p>}
    </div>
  )
}

export function Paginacao({ pagina, porPagina, total, onIr }) {
  const paginas = Math.max(1, Math.ceil((Number(total) || 0) / porPagina))
  if (paginas <= 1) return null
  return (
    <nav aria-label="Páginas" className="mt-5 flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => onIr(pagina - 1)}
        disabled={pagina <= 1}
        className="btn-quiet !px-4 !py-2.5 !text-[14px] disabled:pointer-events-none disabled:opacity-40"
      >
        Anterior
      </button>
      <p className="figs text-[14px] text-ink-muted">
        Página {pagina} de {paginas}
      </p>
      <button
        type="button"
        onClick={() => onIr(pagina + 1)}
        disabled={pagina >= paginas}
        className="btn-quiet !px-4 !py-2.5 !text-[14px] disabled:pointer-events-none disabled:opacity-40"
      >
        Próxima
      </button>
    </nav>
  )
}

// Botão de planilha. É um link comum: o navegador baixa o arquivo direto,
// com o cookie da sessão, sem passar por JavaScript.
export function BaixarPlanilha({ href }) {
  return (
    <a href={href} download className="btn-quiet !px-4 !py-3 !text-[14.5px] whitespace-nowrap">
      Baixar planilha
    </a>
  )
}
