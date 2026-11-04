-- Programa de afiliados (Fase 2). Só acrescenta tabelas e colunas.
-- Dinheiro sempre em centavos (INTEGER). Datas em UTC, texto 'AAAA-MM-DD HH:MM:SS'.
-- Meses do negócio ('AAAA-MM') seguem o calendário de Brasília (UTC-3).

CREATE TABLE IF NOT EXISTS afiliados_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  carencia_dias INTEGER NOT NULL DEFAULT 7 CHECK (carencia_dias >= 0),
  dia_fechamento INTEGER NOT NULL DEFAULT 8 CHECK (dia_fechamento BETWEEN 1 AND 28),
  intervalo_saque_dias INTEGER NOT NULL DEFAULT 15 CHECK (intervalo_saque_dias >= 0),
  saque_minimo_centavos INTEGER NOT NULL DEFAULT 0 CHECK (saque_minimo_centavos >= 0),
  aprovacao_automatica INTEGER NOT NULL DEFAULT 1 CHECK (aprovacao_automatica IN (0, 1)),
  programa_aberto INTEGER NOT NULL DEFAULT 1 CHECK (programa_aberto IN (0, 1)),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_por TEXT
);
INSERT OR IGNORE INTO afiliados_config (id) VALUES (1);

-- Mudar a tabela = inserir linhas novas com valido_desde_mes novo. O mês usa o
-- conjunto de maior valido_desde_mes <= mês. O menor nível define o valor base.
CREATE TABLE IF NOT EXISTS afiliados_niveis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  vendas_minimas INTEGER NOT NULL CHECK (vendas_minimas >= 1),
  valor_por_venda_centavos INTEGER NOT NULL CHECK (valor_por_venda_centavos > 0),
  cor TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  valido_desde_mes TEXT NOT NULL CHECK (valido_desde_mes GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  UNIQUE (valido_desde_mes, vendas_minimas)
);
INSERT OR IGNORE INTO afiliados_niveis (nome, vendas_minimas, valor_por_venda_centavos, cor, ordem, valido_desde_mes) VALUES
  ('Bronze', 1, 1500, '#b45309', 1, '2026-01'),
  ('Prata', 20, 2000, '#94a3b8', 2, '2026-01'),
  ('Ouro', 50, 3000, '#eab308', 3, '2026-01');

CREATE TABLE IF NOT EXISTS afiliados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL UNIQUE REFERENCES clientes(id),
  -- Código do afiliado: só registra a venda (sem desconto, independente da tabela cupons).
  codigo TEXT NOT NULL UNIQUE CHECK (codigo = upper(codigo) AND length(codigo) BETWEEN 4 AND 15 AND codigo NOT GLOB '*[^A-Z0-9]*'),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'ativo', 'suspenso')),
  nivel_fixo_id INTEGER REFERENCES afiliados_niveis(id),
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  telefone TEXT,
  canal TEXT,
  avisar_cada_venda INTEGER NOT NULL DEFAULT 0 CHECK (avisar_cada_venda IN (0, 1)),
  termos_aceitos_em TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS afiliados_pix (
  afiliado_id INTEGER PRIMARY KEY REFERENCES afiliados(id),
  tipo_chave TEXT NOT NULL CHECK (tipo_chave IN ('cpf', 'email', 'telefone', 'aleatoria')),
  chave TEXT NOT NULL,
  titular_nome TEXT NOT NULL,
  titular_cpf TEXT NOT NULL,
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS afiliados_saques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  afiliado_id INTEGER NOT NULL REFERENCES afiliados(id),
  chave TEXT NOT NULL UNIQUE,
  valor_centavos INTEGER NOT NULL CHECK (valor_centavos > 0),
  status TEXT NOT NULL DEFAULT 'solicitado' CHECK (status IN ('solicitado', 'pago', 'recusado')),
  pix_snapshot TEXT NOT NULL,
  pedido_em TEXT NOT NULL DEFAULT (datetime('now')),
  pago_em TEXT,
  comprovante_caminho TEXT,
  nota TEXT,
  pago_por TEXT
);
-- No máximo 1 saque aberto por afiliado: trava o clique duplo no banco.
CREATE UNIQUE INDEX IF NOT EXISTS idx_afiliados_saque_aberto
  ON afiliados_saques(afiliado_id) WHERE status = 'solicitado';
CREATE INDEX IF NOT EXISTS idx_afiliados_saques_afiliado ON afiliados_saques(afiliado_id, pedido_em);

CREATE TABLE IF NOT EXISTS afiliados_lancamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  afiliado_id INTEGER NOT NULL REFERENCES afiliados(id),
  compra_id INTEGER REFERENCES compras(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('venda', 'bonus_nivel', 'ajuste', 'estorno')),
  mes_referencia TEXT NOT NULL CHECK (mes_referencia GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  valor_centavos INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_saque', 'paga', 'cancelada')),
  disponivel_em TEXT NOT NULL DEFAULT (datetime('now')),
  saque_id INTEGER REFERENCES afiliados_saques(id),
  descricao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (tipo NOT IN ('venda', 'estorno') OR compra_id IS NOT NULL)
);
-- Webhook repetido não duplica comissão nem estorno.
CREATE UNIQUE INDEX IF NOT EXISTS idx_afiliados_lanc_venda
  ON afiliados_lancamentos(compra_id) WHERE tipo = 'venda';
CREATE UNIQUE INDEX IF NOT EXISTS idx_afiliados_lanc_estorno
  ON afiliados_lancamentos(compra_id) WHERE tipo = 'estorno';
CREATE UNIQUE INDEX IF NOT EXISTS idx_afiliados_lanc_bonus
  ON afiliados_lancamentos(afiliado_id, mes_referencia) WHERE tipo = 'bonus_nivel';
CREATE INDEX IF NOT EXISTS idx_afiliados_lanc_afiliado
  ON afiliados_lancamentos(afiliado_id, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_afiliados_lanc_saque ON afiliados_lancamentos(saque_id);

CREATE TABLE IF NOT EXISTS afiliados_fechamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  afiliado_id INTEGER NOT NULL REFERENCES afiliados(id),
  mes_referencia TEXT NOT NULL,
  vendas_validas INTEGER NOT NULL,
  vendas_reembolsadas INTEGER NOT NULL DEFAULT 0,
  nivel_id INTEGER REFERENCES afiliados_niveis(id),
  niveis_snapshot TEXT NOT NULL,
  base_centavos INTEGER NOT NULL,
  bonus_centavos INTEGER NOT NULL,
  total_centavos INTEGER NOT NULL,
  fechado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (afiliado_id, mes_referencia)
);

-- visitante_hash: hash com sal secreto, nunca o IP puro.
CREATE TABLE IF NOT EXISTS afiliados_cliques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  afiliado_id INTEGER NOT NULL REFERENCES afiliados(id),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  pagina TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  visitante_hash TEXT NOT NULL,
  dispositivo TEXT
);
CREATE INDEX IF NOT EXISTS idx_afiliados_cliques_afiliado ON afiliados_cliques(afiliado_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_afiliados_cliques_visitante
  ON afiliados_cliques(afiliado_id, visitante_hash, criado_em);

CREATE TABLE IF NOT EXISTS afiliados_eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  afiliado_id INTEGER NOT NULL REFERENCES afiliados(id),
  evento TEXT NOT NULL CHECK (evento IN ('checkout_iniciado', 'codigo_recusado_proprio',
    'codigo_recusado_inativo', 'pagamento_aprovado', 'reembolso', 'chargeback')),
  compra_id INTEGER REFERENCES compras(id),
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_afiliados_eventos_afiliado ON afiliados_eventos(afiliado_id, criado_em);

CREATE TABLE IF NOT EXISTS afiliados_avisos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  afiliado_id INTEGER NOT NULL REFERENCES afiliados(id),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  texto TEXT,
  link TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  lido_em TEXT
);
CREATE INDEX IF NOT EXISTS idx_afiliados_avisos_afiliado ON afiliados_avisos(afiliado_id, criado_em);

-- Auditoria: reaproveita a tabela `registro` (migração 0003). Nada novo aqui.

ALTER TABLE compras ADD COLUMN afiliado_id INTEGER REFERENCES afiliados(id);
ALTER TABLE compras ADD COLUMN codigo_afiliado TEXT;
ALTER TABLE compras ADD COLUMN bruto_centavos INTEGER;
ALTER TABLE compras ADD COLUMN taxa_mp_centavos INTEGER;
ALTER TABLE compras ADD COLUMN liquido_centavos INTEGER;
-- Carimbo (UTC, ISO) do date_last_updated do pagamento que gravou o status atual. Reembolso e
-- aprovação atrasada só mudam o status se o carimbo novo for MAIS recente (ordem dos avisos).
ALTER TABLE compras ADD COLUMN mp_status_em TEXT;
CREATE INDEX IF NOT EXISTS idx_compras_afiliado ON compras(afiliado_id);

-- Limite de pedidos de conta de afiliado por IP (mesmo padrão de leads_tentativas).
CREATE TABLE IF NOT EXISTS afiliados_conta_tentativas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_afiliados_conta_tent_ip ON afiliados_conta_tentativas(ip, criado_em);
