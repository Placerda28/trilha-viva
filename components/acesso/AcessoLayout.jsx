// Coluna de 440 px das telas de entrada e senha (MUDANÇAS §6): /entrar,
// /primeiro-acesso, /criar-senha, /recuperar e /redefinir. Cabeçalho e rodapé
// são os normais do site. `data-rodape-colado` tira a folga antiga do rodapé: o
// fundo branco vai até ele.
export default function AcessoLayout({ children }) {
  return (
    <div data-rodape-colado="" className="bg-white text-ink">
      <div className="mx-auto flex min-h-[560px] max-w-[440px] flex-col gap-6 px-5 pb-[clamp(64px,9vw,128px)] pt-[clamp(40px,7vw,104px)]">
        {children}
      </div>
    </div>
  )
}
