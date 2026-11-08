-- Cupom de campanha agendada: só vale a partir de valido_de (UTC, início do dia
-- de Brasília). NULL = vale desde a criação, como todos os cupons antigos.
ALTER TABLE cupons ADD COLUMN valido_de TEXT;
