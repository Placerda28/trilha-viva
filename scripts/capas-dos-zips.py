"""Procura a capa dentro dos .zip das VS no Backblaze B2, sem baixar nem extrair o zip.

    python -I scripts/capas-dos-zips.py                 todas as músicas
    python -I scripts/capas-dos-zips.py --limite 20     só as 20 primeiras (teste)
    python -I scripts/capas-dos-zips.py --filtro fhop   só as que têm "fhop" no slug ou no arquivo

Como funciona: o índice de um zip fica no fim do arquivo. O script pede ao B2 só
esses últimos KB (rclone cat --offset/--count), acha a imagem com cara de capa e
pede só os bytes dela. Uma VS de 300 MB custa poucos KB de download.
Grava a imagem em tasks/capas/das-vs/<slug>.<ext> e o relatório em
tasks/capas/das-vs.csv. Quem já tem capa nessa pasta é pulado (dá para parar e
continuar depois).

Chaves: as mesmas do envio do acervo (chaves.txt da pasta "subir acervo":
keyID, applicationKey, balde). Elas vão para o rclone por variável de ambiente,
nunca na linha de comando nem na tela.

.rar fica de fora: rar não tem índice no fim, teria que baixar o arquivo todo.
O nome gravado é sempre o slug: nada de dentro do zip vira caminho no disco.
"""
import csv
import io
import json
import os
import subprocess
import sys
import zipfile

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENVIO = r'G:\Meu Drive\01 - OFICINA\02. TRILHA VIVA\01 - DEV (ARQUIVOS DO SITE)\Claude outputs\subir acervo'
LISTA = os.environ.get('TV_ARQ', os.path.join(ENVIO, 'arquivos.json'))
CHAVES = os.environ.get('TV_CHAVES', os.path.join(ENVIO, 'chaves.txt'))
SAIDA = os.path.join(RAIZ, 'tasks', 'capas', 'das-vs')
CSV = os.path.join(RAIZ, 'tasks', 'capas', 'das-vs.csv')
IMAGEM = ('.jpg', '.jpeg', '.png', '.webp')
BOM_NOME = ('album', 'cover', 'capa', 'folder', 'artwork', 'front')
MIN_BYTES = 8_000          # menor que isso é ícone, não capa
MAX_BYTES = 15_000_000     # maior que isso não é capa
BLOCO = 256 * 1024         # cada pedido ao B2 traz pelo menos isto


def ler_chaves():
    conf = {}
    with open(CHAVES, encoding='utf-8-sig') as f:
        for linha in f:
            if '=' in linha:
                k, v = linha.split('=', 1)
                conf[k.strip()] = v.strip()
    env = dict(os.environ, RCLONE_B2_ACCOUNT=conf['keyID'], RCLONE_B2_KEY=conf['applicationKey'])
    return env, ':b2:' + conf['balde']


class ArquivoRemoto(io.RawIOBase):
    """Arquivo do B2 lido por pedaços: o zipfile pula para onde quer e só vem o que ele lê."""

    def __init__(self, remoto, tamanho, env):
        self.remoto, self.tamanho, self.env, self.pos, self.cache = remoto, tamanho, env, 0, {}

    def readable(self):
        return True

    def seekable(self):
        return True

    def seek(self, pos, de=0):
        self.pos = pos if de == 0 else self.pos + pos if de == 1 else self.tamanho + pos
        return self.pos

    def tell(self):
        return self.pos

    def _bloco(self, i):
        if i not in self.cache:
            r = subprocess.run(
                ['rclone', 'cat', self.remoto, '--offset', str(i * BLOCO), '--count', str(BLOCO)],
                env=self.env, capture_output=True, timeout=120,
            )
            if r.returncode != 0:
                raise OSError('rclone cat falhou')
            self.cache[i] = r.stdout
        return self.cache[i]

    def read(self, n=-1):
        if n is None or n < 0:
            n = self.tamanho - self.pos
        n = max(0, min(n, self.tamanho - self.pos))
        partes = []
        while n > 0:
            i, dentro = divmod(self.pos, BLOCO)
            pedaco = self._bloco(i)[dentro:dentro + n]
            if not pedaco:
                break
            partes.append(pedaco)
            self.pos += len(pedaco)
            n -= len(pedaco)
        return b''.join(partes)

    def readinto(self, b):
        dados = self.read(len(b))
        b[:len(dados)] = dados
        return len(dados)


def escolher(infos):
    """A maior imagem com nome de capa (Album, cover...). Ignora lixo do Mac."""
    candidatas = [
        i for i in infos
        if not i.is_dir()
        and i.filename.lower().endswith(IMAGEM)
        and '__macosx' not in i.filename.lower()
        and not os.path.basename(i.filename).startswith('._')
        and MIN_BYTES <= i.file_size <= MAX_BYTES
    ]
    # Só imagem com nome de capa: "WR MULTITRACK.jpg", "maxresdefault.jpg" e prints de
    # tela vieram em zips e não eram capa (conferido em 20/11/2026).
    nome_bom = lambda i: any(p in os.path.basename(i.filename).lower() for p in BOM_NOME)
    candidatas = [i for i in candidatas if nome_bom(i)]
    if not candidatas:
        return None
    return max(candidatas, key=lambda i: i.file_size)


def tamanhos(env, balde):
    """Tamanho de cada arquivo do balde, numa listagem só."""
    r = subprocess.run(['rclone', 'lsjson', '-R', '--files-only', balde], env=env, capture_output=True, timeout=600)
    if r.returncode != 0:
        sys.exit('não consegui listar o balde no B2 (confira o chaves.txt)')
    return {x['Path']: x['Size'] for x in json.loads(r.stdout)}


def main():
    limite = int(sys.argv[sys.argv.index('--limite') + 1]) if '--limite' in sys.argv else None
    os.makedirs(SAIDA, exist_ok=True)
    env, balde = ler_chaves()
    with open(LISTA, encoding='utf-8') as f:
        lista = json.load(f)
    tam = tamanhos(env, balde)
    filtro = sys.argv[sys.argv.index('--filtro') + 1].lower() if '--filtro' in sys.argv else ''
    itens = [(s, a) for s, a in lista.items() if filtro in (s + ' ' + ' '.join(a)).lower()][:limite]
    conta = {'achou': 0, 'sem-imagem': 0, 'so-rar': 0, 'erro': 0, 'nao-esta-no-b2': 0, 'ja-tinha': 0}
    novo = not os.path.exists(CSV)
    with open(CSV, 'a', newline='', encoding='utf-8') as fcsv:
        w = csv.writer(fcsv)
        if novo:
            w.writerow(['slug', 'situacao', 'arquivo', 'imagem_no_zip'])
        for n, (slug, arquivos) in enumerate(itens, 1):
            if any(os.path.exists(os.path.join(SAIDA, slug + e)) for e in ('.jpg', '.png', '.webp')):
                conta['ja-tinha'] += 1
                continue
            situacao, origem, interno = 'so-rar', '', ''
            for rel in arquivos:
                if not rel.lower().endswith('.zip'):
                    continue
                rel_b2 = rel.replace('\\', '/')
                if rel_b2 not in tam:
                    situacao, origem = 'nao-esta-no-b2', rel
                    continue
                try:
                    remoto = ArquivoRemoto(f'{balde}/{rel_b2}', tam[rel_b2], env)
                    with zipfile.ZipFile(io.BufferedReader(remoto, buffer_size=BLOCO)) as z:
                        capa = escolher(z.infolist())
                        if not capa:
                            situacao, origem = 'sem-imagem', rel
                            continue
                        ext = os.path.splitext(capa.filename)[1].lower().replace('.jpeg', '.jpg')
                        dados = z.read(capa)
                    with open(os.path.join(SAIDA, slug + ext), 'wb') as dst:
                        dst.write(dados)
                    situacao, origem, interno = 'achou', rel, capa.filename
                    break
                except Exception as e:  # zip corrompido, falha de rede etc.
                    situacao, origem, interno = 'erro', rel, str(e)[:120]
            conta[situacao] += 1
            w.writerow([slug, situacao, origem, interno])
            fcsv.flush()
            if n % 25 == 0:
                print(f'{n}/{len(itens)}', conta, flush=True)
    print('fim', conta)


if __name__ == '__main__':
    main()
