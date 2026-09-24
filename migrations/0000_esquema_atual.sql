-- Retrato do banco de produção em 24/09/2026, lido com
--   npx wrangler d1 execute trilha-viva --remote --command "SELECT sql FROM sqlite_master"
-- Serve SÓ para montar a cópia local de testes (--local). Na produção estas
-- tabelas já existem; o IF NOT EXISTS garante que rodar de novo não estraga nada.
CREATE TABLE IF NOT EXISTS clientes ( id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, nome TEXT, senha_hash TEXT, criado_em TEXT NOT NULL DEFAULT (datetime('now')), ultimo_acesso TEXT, bloqueado INTEGER NOT NULL DEFAULT 0 , supabase_id TEXT);
CREATE TABLE IF NOT EXISTS compras ( id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER NOT NULL REFERENCES clientes(id), stripe_session_id TEXT NOT NULL UNIQUE, stripe_payment_intent TEXT, valor_centavos INTEGER, moeda TEXT, status TEXT NOT NULL DEFAULT 'pago', criado_em TEXT NOT NULL DEFAULT (datetime('now')) );
CREATE TABLE IF NOT EXISTS tokens ( id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER NOT NULL REFERENCES clientes(id), token_hash TEXT NOT NULL UNIQUE, tipo TEXT NOT NULL, expira_em TEXT NOT NULL, usado_em TEXT, criado_em TEXT NOT NULL DEFAULT (datetime('now')) );
CREATE TABLE IF NOT EXISTS sessoes ( id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER NOT NULL REFERENCES clientes(id), token_hash TEXT NOT NULL UNIQUE, expira_em TEXT NOT NULL, criado_em TEXT NOT NULL DEFAULT (datetime('now')), ip TEXT, agente TEXT );
CREATE TABLE IF NOT EXISTS downloads ( id INTEGER PRIMARY KEY AUTOINCREMENT, cliente_id INTEGER NOT NULL REFERENCES clientes(id), arquivo TEXT NOT NULL, slug TEXT, criado_em TEXT NOT NULL DEFAULT (datetime('now')), ip TEXT );
CREATE TABLE IF NOT EXISTS tentativas ( id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, ip TEXT, sucesso INTEGER NOT NULL DEFAULT 0, criado_em TEXT NOT NULL DEFAULT (datetime('now')) );
CREATE INDEX IF NOT EXISTS idx_compras_cliente ON compras(cliente_id);
CREATE INDEX IF NOT EXISTS idx_tokens_cliente ON tokens(cliente_id, tipo);
CREATE INDEX IF NOT EXISTS idx_sessoes_expira ON sessoes(expira_em);
CREATE INDEX IF NOT EXISTS idx_downloads_cliente ON downloads(cliente_id, criado_em);
CREATE INDEX IF NOT EXISTS idx_tentativas_email ON tentativas(email, criado_em);
