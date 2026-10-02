import WhatsappConversas from '@/components/gestao/WhatsappConversas'

// A permissão é conferida no middleware e no layout. Os dados chegam de
// /api/gestao/whatsapp, que confere mais uma vez.
export default function WhatsappPage() {
  return <WhatsappConversas />
}
