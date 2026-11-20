import { ListaCarregando } from '@/components/ds'

// Aparece no lugar do conteúdo (o menu fica) enquanto a página da conta monta.
export default function CarregandoConta() {
  return <ListaCarregando linhas={5} rotulo="Carregando" className="pt-2" />
}
