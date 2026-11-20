// Configuração de cada tela de conta (MUDANÇAS §6): rota da API, textos e campos.
// As rotas, a regra de senha (mínimo de 8 caracteres) e a validade dos links são as de sempre.

export const MODOS = {
  entrar: {
    rota: '/api/conta/entrar',
    titulo: 'Entrar',
    sub: 'Use o e-mail da sua compra.',
    botao: 'Entrar',
    enviando: 'Entrando…',
    pedeEmail: true,
    pedeSenha: true,
    confirma: false,
  },
  criar: {
    rota: '/api/conta/criar',
    titulo: 'Crie sua senha',
    sub: 'É o último passo. A conta usa o e-mail da sua compra.',
    botao: 'Criar senha e abrir Minhas VS',
    enviando: 'Criando sua conta…',
    pedeEmail: false,
    pedeSenha: true,
    confirma: true,
  },
  // Comprou e fechou a tela sem criar a senha: pede o link de criar senha.
  primeiro: {
    rota: '/api/conta/primeiro-acesso',
    titulo: 'Primeiro acesso',
    sub: 'Comprou e ainda não criou sua senha? Digite o e-mail que você usou no pagamento. Mandamos um link para criar a senha.',
    botao: 'Enviar link',
    enviando: 'Enviando…',
    pedeEmail: true,
    pedeSenha: false,
    confirma: false,
  },
  recuperar: {
    rota: '/api/conta/recuperar',
    titulo: 'Esqueci a senha',
    sub: 'Digite seu e-mail. Mandamos um link para você criar uma senha nova.',
    botao: 'Enviar link',
    enviando: 'Enviando…',
    pedeEmail: true,
    pedeSenha: false,
    confirma: false,
  },
  redefinir: {
    rota: '/api/conta/redefinir',
    titulo: 'Senha nova',
    sub: 'Escolha a nova senha. Ao salvar, quem estiver logado nesta conta em outros aparelhos será desconectado.',
    botao: 'Salvar senha nova',
    enviando: 'Salvando…',
    pedeEmail: false,
    pedeSenha: true,
    confirma: true,
  },
}
