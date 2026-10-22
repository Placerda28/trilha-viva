-- VS grátis: contatos, consentimento e link temporário. Todas as datas são UTC.
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  whatsapp TEXT NOT NULL,
  consentimento INTEGER NOT NULL DEFAULT 0,
  consentimento_em TEXT,
  origem TEXT,
  meio TEXT,
  campanha TEXT,
  pagina_entrada TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  ultimo_envio_em TEXT,
  envios INTEGER NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0,
  primeiro_download_em TEXT,
  comprou INTEGER NOT NULL DEFAULT 0,
  comprou_em TEXT,
  descadastrado INTEGER NOT NULL DEFAULT 0,
  token_hash TEXT NOT NULL,
  token_expira_em TEXT NOT NULL,
  etapa_email INTEGER NOT NULL DEFAULT 0,
  proximo_email_em TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_token ON leads(token_hash);
CREATE INDEX IF NOT EXISTS idx_leads_criado ON leads(criado_em, id);
CREATE INDEX IF NOT EXISTS idx_leads_email_pendente ON leads(proximo_email_em)
  WHERE descadastrado = 0 AND comprou = 0 AND consentimento = 1;

-- O freio de login não serve aqui: sucesso no login apaga suas tentativas.
CREATE TABLE IF NOT EXISTS leads_tentativas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_tentativas_ip ON leads_tentativas(ip, criado_em);
CREATE INDEX IF NOT EXISTS idx_leads_tentativas_data ON leads_tentativas(criado_em);
