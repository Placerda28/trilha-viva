import { ImageResponse } from 'next/og'
import { INK, PAPER, MUTED, LINE, Cabecalho } from '@/lib/og-marca'
import { posts, getPost } from '@/lib/posts'

// Capa de cada artigo no visual da marca (item 4.4 do plano de SEO): o título
// do post sobre o fundo claro, sem foto. Gerada no build, uma por artigo.
export const runtime = 'nodejs'
export const alt = 'Artigo do blog Trilha Viva'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }))
}

export default async function Capa({ params }) {
  const { slug } = await params
  const post = getPost(slug)
  const titulo = post?.title || 'Blog Trilha Viva'
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: PAPER,
          padding: '68px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        <Cabecalho />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {post?.tag && <div style={{ fontSize: 26, color: MUTED }}>{post.tag}</div>}
          <div style={{ fontSize: titulo.length > 60 ? 56 : 66, color: INK, lineHeight: 1.08, letterSpacing: -2 }}>
            {titulo}
          </div>
        </div>
        <div style={{ display: 'flex', borderTop: `1px solid ${LINE}`, paddingTop: 26, fontSize: 26, color: MUTED }}>
          trilhaviva.org/blog
        </div>
      </div>
    ),
    size
  )
}
