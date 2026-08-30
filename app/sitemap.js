import { songs } from '@/lib/catalog'
import { artistList } from '@/lib/artists'
import { posts } from '@/lib/posts'
import { site } from '@/lib/site'

export default function sitemap() {
  const now = new Date()

  const statics = [
    { url: '/', priority: 1, changeFrequency: 'weekly' },
    { url: '/assinar', priority: 0.95, changeFrequency: 'weekly' },
    { url: '/musicas', priority: 0.9, changeFrequency: 'weekly' },
    { url: '/artistas', priority: 0.8, changeFrequency: 'weekly' },
    { url: '/como-usar', priority: 0.85, changeFrequency: 'monthly' },
    { url: '/blog', priority: 0.7, changeFrequency: 'weekly' },
    { url: '/faq', priority: 0.7, changeFrequency: 'monthly' },
    { url: '/termos', priority: 0.3, changeFrequency: 'yearly' },
    { url: '/privacidade', priority: 0.3, changeFrequency: 'yearly' },
  ].map((p) => ({
    url: `${site.url}${p.url}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))

  const songUrls = songs.map((s) => ({
    url: `${site.url}/musicas/${s.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  const artistUrls = artistList.map((a) => ({
    url: `${site.url}/artistas/${a.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.55,
  }))

  const postUrls = posts.map((p) => ({
    url: `${site.url}/blog/${p.slug}`,
    lastModified: new Date(p.date + 'T12:00:00'),
    changeFrequency: 'monthly',
    priority: 0.65,
  }))

  return [...statics, ...songUrls, ...artistUrls, ...postUrls]
}
