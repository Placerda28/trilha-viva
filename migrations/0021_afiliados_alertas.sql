-- Fase 8A dos afiliados (Dashboard, Financeiro e Alertas da Gestão). Só acrescenta.
-- Alertas são calculados na hora; esta tabela só guarda a chave dos que a Gestão marcou como resolvidos
-- (alerta resolvido não volta). Datas em UTC, texto 'AAAA-MM-DD HH:MM:SS'.
CREATE TABLE IF NOT EXISTS afiliados_alertas_resolvidos (
  chave TEXT PRIMARY KEY,
  resolvido_em TEXT NOT NULL DEFAULT (datetime('now')),
  resolvido_por TEXT
);

-- Índices das consultas por período (extrato, custo do programa, saques e alertas).
CREATE INDEX IF NOT EXISTS idx_afiliados_lanc_criado ON afiliados_lancamentos(criado_em);
CREATE INDEX IF NOT EXISTS idx_afiliados_cliques_criado ON afiliados_cliques(criado_em);
CREATE INDEX IF NOT EXISTS idx_afiliados_eventos_tipo ON afiliados_eventos(evento, criado_em);
CREATE INDEX IF NOT EXISTS idx_afiliados_saques_status ON afiliados_saques(status, pedido_em);
