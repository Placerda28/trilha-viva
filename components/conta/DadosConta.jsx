import { Aviso, Botao, Campo } from '@/components/ds'
import TituloConta, { SecaoTitulo } from './TituloConta'

// Meus dados (/minha-conta/dados). A tela está pronta, mas salvar dados e trocar
// senha ainda não têm rota no servidor (app/api/conta tem só entrar, criar,
// recuperar, redefinir, primeiro-acesso, relatar, downloads, estado e sair).
// Por isso os campos aparecem preenchidos, sem edição, e os botões ficam
// desativados. Quando a rota existir, é só trocar `readOnly`/`disabled` por
// estado e ligar o envio. Trocar a senha já funciona pelo e-mail (/recuperar).
export default function DadosConta({ nome, email }) {
  return (
    <div className="flex flex-col gap-7">
      <TituloConta titulo="Meus dados" subtitulo="Nome, e-mail, WhatsApp e senha." />

      <Aviso variante="info" titulo="Edição ainda não disponível.">
        Para corrigir nome, e-mail ou WhatsApp agora, escreva em{' '}
        <a href="/minha-conta/ajuda" className="font-semibold underline underline-offset-[3px]">
          Ajuda
        </a>
        .
      </Aviso>

      <form className="flex max-w-[520px] flex-col gap-4" noValidate aria-labelledby="h-dados">
        <SecaoTitulo id="h-dados">Seus dados</SecaoTitulo>
        <Campo rotulo="Nome" autoComplete="name" value={nome || ''} readOnly />
        <Campo
          rotulo="E-mail"
          tipo="email"
          autoComplete="email"
          value={email || ''}
          readOnly
          ajuda="É com ele que você entra. Se trocar, mandamos um link para confirmar o e-mail novo."
        />
        <Campo
          rotulo="WhatsApp com DDD"
          tipo="tel"
          autoComplete="tel-national"
          placeholder="(11) 90000-0000"
          campoClassName="tabular-nums"
          value=""
          disabled
        />
        <Botao type="submit" disabled className="self-start px-[22px]">
          Salvar dados
        </Botao>
      </form>

      <form
        className="flex max-w-[520px] flex-col gap-4 border-t border-line pt-7"
        noValidate
        aria-labelledby="h-senha"
      >
        <SecaoTitulo id="h-senha">Trocar senha</SecaoTitulo>
        <Campo rotulo="Senha atual" tipo="password" autoComplete="current-password" value="" disabled />
        <Campo
          rotulo="Senha nova"
          tipo="password"
          autoComplete="new-password"
          ajuda="Use pelo menos 8 caracteres."
          value=""
          disabled
        />
        <Botao type="submit" variante="contorno" disabled className="self-start px-[22px]">
          Trocar senha
        </Botao>
        <p className="text-[15px] leading-[1.5] text-text-2">
          Quer trocar agora? Receba por e-mail um link para escolher a senha nova.{' '}
          <a href="/recuperar" className="inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-[3px]">
            Enviar o link
          </a>
        </p>
      </form>
    </div>
  )
}
