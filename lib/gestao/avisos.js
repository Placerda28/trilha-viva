import { isoUtc } from './clientes.js'

function linhas(resultado) {
  return Array.isArray(resultado?.results) ? resultado.results : []
}

function contagem(resultado) {
  return Number(linhas(resultado)[0]?.n || 0)
}

// "Precisa de você": só COUNTs e listas curtas, num único db.batch().
// `master` liga a contagem de membros que ainda não trocaram a senha; para
// membro da equipe ela volta null.
export async function consultarAvisos(db, { master = false } = {}) {
  const comandos = [
    // Conversas cuja última mensagem é do cliente e a janela de 24 h da Meta ainda está aberta.
    db.prepare(`
      SELECT COUNT(DISTINCT m.telefone) AS n
        FROM whatsapp_mensagens m
       WHERE m.direcao = 'entrada'
         AND m.criado_em > datetime('now', '-24 hours')
         AND NOT EXISTS (
           SELECT 1 FROM whatsapp_mensagens s
            WHERE s.telefone = m.telefone AND s.direcao = 'saida'
              AND (s.criado_em > m.criado_em OR (s.criado_em = m.criado_em AND s.id > m.id))
            LIMIT 1
         )`),
    db.prepare('SELECT estado, modelo_status FROM whatsapp_estado WHERE id = 1 LIMIT 1'),
    // tem_senha vem de supabase_id (a senha mora na Supabase).
    db.prepare(`
      SELECT COUNT(DISTINCT c.id) AS n
        FROM compras_reais p
        JOIN clientes c ON c.id = p.cliente_id
       WHERE p.status = 'pago' AND c.supabase_id IS NULL
         AND p.criado_em < datetime('now', '-48 hours')`),
    db.prepare(`
      SELECT COUNT(*) AS n
        FROM compras_reais
       WHERE status = 'pago' AND criado_em >= datetime('now', '-30 days')
         AND meta_status IS NOT NULL AND meta_status NOT IN ('ok', 'teste')`),
    db.prepare(`
      SELECT codigo, valido_ate
        FROM cupons
       WHERE ativo = 1 AND valido_ate >= datetime('now') AND valido_ate <= datetime('now', '+7 days')
       ORDER BY valido_ate
       LIMIT 10`),
    // Mesma ocupação que o checkout usa (compras + reservas ativas): é ela que bloqueia a venda.
    db.prepare(`
      SELECT codigo, limite, usos FROM (
        SELECT c.codigo, c.limite_usos AS limite,
               (SELECT COUNT(*) FROM compras p WHERE p.cupom = c.codigo LIMIT 1) +
               (SELECT COUNT(*) FROM cupom_reservas r
                 WHERE r.cupom_id = c.id AND r.expira_em > datetime('now') LIMIT 1) AS usos
          FROM cupons c
         WHERE c.ativo = 1 AND c.valido_ate >= datetime('now')
      )
       WHERE usos * 5 >= limite * 4
       ORDER BY codigo
       LIMIT 10`),
  ]
  if (master) {
    comandos.push(db.prepare(
      'SELECT COUNT(*) AS n FROM equipe WHERE ativo = 1 AND precisa_trocar_senha = 1'
    ))
  }

  const [esperando, estado, semSenha, meta, vencendo, esgotando, membros] = await db.batch(comandos)
  const robo = linhas(estado)[0]
  return {
    whatsapp_esperando: contagem(esperando),
    robo: {
      estado: robo?.estado || 'aguardando_modelo',
      modelo_status: robo?.modelo_status || null,
    },
    sem_senha_48h: contagem(semSenha),
    meta_falhou_30d: contagem(meta),
    cupons_vencendo: linhas(vencendo).map((c) => ({ codigo: c.codigo, valido_ate: isoUtc(c.valido_ate) })),
    cupons_esgotando: linhas(esgotando).map((c) => ({
      codigo: c.codigo,
      usos: Number(c.usos || 0),
      limite: Number(c.limite || 0),
    })),
    membros_sem_trocar: master ? contagem(membros) : null,
  }
}
