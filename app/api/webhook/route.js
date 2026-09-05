import { NextResponse } from 'next/server'
import { getCryptoProvider, getStripe } from '@/lib/stripe'
import { site } from '@/lib/site'
import { escapeHtml, safeUrl } from '@/lib/safe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function emailHtml({ nome, url }) {
  // nome vem do checkout da Stripe e url vem de DRIVE_URL: os dois entram em
  // markup, então passam por escape antes de virar HTML.
  const nomeSeguro = escapeHtml(nome)
  const urlSegura = safeUrl(url)
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f7f7fa;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0a0a0b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e9e9ef;border-radius:18px;overflow:hidden">
        <tr><td style="padding:32px 32px 8px">
          <p style="margin:0;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8e8e98;font-weight:700">Trilha Viva · Multitracks Gospel</p>
          <h1 style="margin:14px 0 0;font-size:26px;line-height:1.2;letter-spacing:-.03em">Seu acesso está liberado${nomeSeguro ? `, ${nomeSeguro}` : ''}!</h1>
          <p style="margin:14px 0 0;font-size:15px;line-height:1.65;color:#61616b">Pagamento confirmado. O acervo completo com mais de 4.000 multitracks gospel já está disponível no link abaixo — clique, guia e canais separados, prontos para o próximo culto.</p>
        </td></tr>
        <tr><td style="padding:24px 32px 8px">
          <a href="${urlSegura}" style="display:inline-block;background:#0a0a0b;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 26px;border-radius:999px">Abrir o acervo completo</a>
          <p style="margin:14px 0 0;font-size:12.5px;color:#8e8e98;word-break:break-all">${urlSegura}</p>
        </td></tr>
        <tr><td style="padding:20px 32px 32px">
          <p style="margin:0;font-size:14px;line-height:1.65;color:#61616b"><strong>Primeiros passos:</strong> baixe a pasta da música, arraste os canais para o REAPER (ou o programa que preferir) e mande clique e guia para a saída do fone. O guia completo está em <a href="${site.url}/como-usar" style="color:#1d4ed8">${site.url.replace('https://', '')}/como-usar</a>.</p>
          <p style="margin:18px 0 0;font-size:12.5px;line-height:1.6;color:#8e8e98">Este acesso é pessoal, para o seu ministério. Guarde este e-mail: ele é o seu comprovante de acesso vitalício.</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`
}

async function sendEmail({ to, nome, url }) {
  const key = process.env.RESEND_API_KEY
  if (!key || !to || !url) return
  const from = process.env.EMAIL_FROM || 'Trilha Viva <onboarding@resend.dev>'
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'Seu acesso ao acervo Trilha Viva está liberado',
        html: emailHtml({ nome, url }),
      }),
    })
    if (!res.ok) console.error('resend error', await res.text())
  } catch (err) {
    console.error('email error', err?.message)
  }
}

export async function POST(req) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) {
    return NextResponse.json({ received: true, skipped: 'not_configured' })
  }

  const sig = req.headers.get('stripe-signature')
  const raw = await req.text()

  let event
  try {
    // constructEventAsync + SubtleCrypto: o constructEvent síncrono depende do
    // crypto do Node e não roda nos Cloudflare Workers.
    event = await stripe.webhooks.constructEventAsync(
      raw,
      sig,
      secret,
      undefined,
      getCryptoProvider()
    )
  } catch (err) {
    console.error('webhook signature error', err?.message)
    return NextResponse.json({ error: 'assinatura inválida' }, { status: 400 })
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object
    if (session.payment_status === 'paid') {
      await sendEmail({
        to: session.customer_details?.email,
        nome: session.metadata?.nome || session.customer_details?.name,
        url: process.env.DRIVE_URL,
      })
    }
  }

  return NextResponse.json({ received: true })
}
