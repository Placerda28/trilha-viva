-- Fase 8B dos afiliados (aba Afiliados da Gestão). Só acrescenta tabelas e colunas.
-- Datas em UTC, texto 'AAAA-MM-DD HH:MM:SS'.

-- Anotações internas sobre um afiliado (só a equipe lê; o afiliado nunca vê).
CREATE TABLE IF NOT EXISTS afiliados_anotacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  afiliado_id INTEGER NOT NULL REFERENCES afiliados(id),
  texto TEXT NOT NULL,
  autor TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_afiliados_anotacoes_afiliado ON afiliados_anotacoes(afiliado_id, id);

-- Códigos que um afiliado já teve. Ficam reservados para sempre: se outra pessoa pegasse o código antigo,
-- os links já divulgados passariam a render venda para ela. As vendas continuam do afiliado pelo afiliado_id.
CREATE TABLE IF NOT EXISTS afiliados_codigos_antigos (
  codigo TEXT PRIMARY KEY,
  afiliado_id INTEGER NOT NULL REFERENCES afiliados(id),
  trocado_em TEXT NOT NULL DEFAULT (datetime('now')),
  trocado_por TEXT
);
CREATE INDEX IF NOT EXISTS idx_afiliados_codigos_antigos_afiliado ON afiliados_codigos_antigos(afiliado_id);

-- Quem gravou cada conjunto da tabela de níveis e quando (a Gestão mostra o histórico de mudanças).
-- Linhas antigas ficam com NULL.
ALTER TABLE afiliados_niveis ADD COLUMN criado_por TEXT;
ALTER TABLE afiliados_niveis ADD COLUMN criado_em TEXT;

-- A ficha do afiliado lê o histórico de ações pelo alvo (código do afiliado).
CREATE INDEX IF NOT EXISTS idx_registro_alvo ON registro(alvo, id);
