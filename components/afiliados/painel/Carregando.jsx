// Estado de espera e de erro das abas que buscam dados. Mesma caixa nos dois, para
// a página não pular.
export function Carregando({ texto = 'Carregando…' }) {
  return (
    <div role="status" aria-busy="true" className="card-line px-5 py-10 text-center text-[15px] text-ink-muted">
      {texto}
    </div>
  )
}

export function Falhou({ onTentar }) {
  return (
    <div role="alert" className="card-line px-5 py-8 text-center">
      <p className="text-[16px] font-bold text-ink">Não deu para carregar agora.</p>
      <p className="mt-1 text-[14.5px] text-ink-muted">Confira sua conexão e tente de novo.</p>
      <button type="button" onClick={onTentar} className="btn-quiet mt-4 min-h-11 px-6 py-3">
        Tentar de novo
      </button>
    </div>
  )
}
