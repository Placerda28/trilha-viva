import Instagram from '@/components/gestao/Instagram'

// A permissão é conferida no middleware e no layout. Os dados chegam de
// /api/gestao/instagram, que confere mais uma vez.
export default function InstagramPage() {
  return <Instagram />
}
