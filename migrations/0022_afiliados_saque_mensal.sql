-- Regra do dono (05/11/2026): nada fica disponível antes do fechamento do mês; no fechamento, o total do mês
-- libera de uma vez, e o saque é de 1 pedido por mês, a partir do dia de fechamento.
-- Só dados, nenhuma coluna nova. afiliados_config.carencia_dias e intervalo_saque_dias continuam na tabela, sem uso.
-- Idempotente: lançamentos de venda de mês ainda NÃO fechado, pendentes e fora de saque, passam ao marcador
-- "só depois do fechamento" (o fecharMes troca por fechado_em). Rodar de novo não muda nada.
UPDATE afiliados_lancamentos
   SET disponivel_em = '9999-12-31 23:59:59'
 WHERE tipo = 'venda' AND status = 'pendente' AND saque_id IS NULL
   AND disponivel_em <> '9999-12-31 23:59:59'
   AND NOT EXISTS (SELECT 1 FROM afiliados_fechamentos f
                    WHERE f.afiliado_id = afiliados_lancamentos.afiliado_id AND f.mes_referencia = afiliados_lancamentos.mes_referencia);
