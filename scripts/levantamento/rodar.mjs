import { writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { connectB2 } from './b2.mjs'
import { indexArchive } from './indices.mjs'
import { audioFiles, channel, extractNames, selectPilot } from './nomes.mjs'
import { entryPrefix } from './extrair.mjs'
import { wavInfo, decodeWav, detectBpm, resolveBpm, mp3Info, decodeMp3 } from './audio.mjs'
import { openCache } from './cache.mjs'

const root=resolve(fileURLToPath(new URL('../../',import.meta.url)))
const checkpointDir=join(tmpdir(),'tv-levantamento')
const csv=rows=>rows.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n'

export function options(args) {
  const result={limit:null,slugs:null,pilot:false,reprocess:false}
  for(let i=0;i<args.length;i++) {
    if(args[i]==='--piloto') result.pilot=true
    else if(args[i]==='--reprocessar') result.reprocess=true
    else if(args[i]==='--limite') {
      result.limit=Number(args[++i])
      if(!Number.isInteger(result.limit)||result.limit<1) throw new Error('limite_invalido')
    } else if(args[i]==='--slugs') {
      result.slugs=args[++i]?.split(',').filter(Boolean)
      if(!result.slugs?.length) throw new Error('slugs_ausentes')
    } else throw new Error('opcao_desconhecida')
  }
  if(!result.pilot&&!result.slugs&&!result.limit&&!result.reprocess) throw new Error('informe_--piloto_--slugs_ou_--limite')
  if(result.pilot&&result.slugs) throw new Error('piloto_e_slugs_incompativeis')
  return result
}

export async function survey(file,path) {
  const result={caminho:path,bpm:null,tom:null,duracao_seg:null,canais:[],qtd_arquivos:null,qtd_reconhecidos:null,
    fonte_bpm:null,fonte_tom:null,confianca_bpm:null,bpm_alternativas:[],erro:null}
  const warnings=[],unknown={}, stats={rar_store:0,rar_compactado:0,rar_arquivos_store:0,rar_arquivos_compactados:0,rar_sem_bpm_audio:0}
  let entries,detected=null
  try {entries=(await indexArchive(file.read,file.size,/\.rar$/i.test(path)?'rar':'zip')).entries}
  catch(error) {if(error.code==='CACHE_MISS')throw error;result.erro='erro_indice';return {result,unknown,stats}}
  const audio=audioFiles(entries)
  result.qtd_arquivos=audio.length
  result.qtd_reconhecidos=audio.filter(e=>channel(e.name)).length
  result.canais=[...new Set(audio.map(e=>channel(e.name)).filter(Boolean))]
  for(const e of audio) if(!channel(e.name)) {
    const name=e.name.split(/[\\/]/).at(-1);unknown[name]=(unknown[name]??0)+1
  }
  const named=extractNames([path,...audio.map(e=>e.name)])
  result.bpm=named.bpm;result.tom=named.tom;warnings.push(...named.conflicts)
  if(result.bpm!==null) result.fonte_bpm='nome'
  if(result.tom!==null) result.fonte_tom='nome'
  const rar=/\.rar$/i.test(path)
  if(rar) {
    stats.rar_store=audio.filter(e=>e.method==='store').length
    stats.rar_compactado=audio.filter(e=>e.method!=='store').length
    stats.rar_arquivos_store=Number(audio.length>0&&stats.rar_compactado===0)
    stats.rar_arquivos_compactados=Number(stats.rar_compactado>0)
    if(!result.bpm&&audio.some(e=>channel(e.name)==='Clique'&&e.method!=='store')) stats.rar_sem_bpm_audio=1
  }
  const candidates=[...audio].sort((a,b)=>Number(channel(b.name)==='Clique')-Number(channel(a.name)==='Clique'))
  for(const e of candidates) {
    const click=channel(e.name)==='Clique'
    const needBpm=!result.bpm&&!detected&&!named.conflicts.includes('bpm_conflitante_nome')&&click
    if(result.duracao_seg!==null&&!needBpm) continue
    if(!/\.(wav|mp3)$/i.test(e.name)||!['store','deflate'].includes(e.method)) continue
    try {
      let prefix=await entryPrefix(file,e,65536,2*1024*1024)
      const isWav=/\.wav$/i.test(e.name)
      const entryKey=JSON.stringify([e.offset??e.dataOffset,e.name])
      const info=await file.metadata(entryKey,()=>isWav?wavInfo(prefix):mp3Info(prefix,e.size))
      if(info?.duration>0&&Number.isFinite(info.duration)) result.duracao_seg??=Math.round(info.duration)
      if(needBpm) {
        // Estimativa pela proporção compactada, com folga; teto evita downloads grandes.
        const estimate=info?.byteRate&&e.size>0?Math.ceil(info.byteRate*90*e.compressedSize/e.size*1.5):8*1024*1024
        const decoded=await file.pcm(entryKey,async()=>{
          prefix=await entryPrefix(file,e,Math.min(32*1024*1024,Math.max(65536,estimate)))
          return isWav?decodeWav(prefix,90):decodeMp3(prefix)
        })
        const analysis=decoded?detectBpm(decoded.samples,decoded.sampleRate):null
        if(analysis?.candidates?.length)detected=analysis
        else warnings.push('clique_sem_consistencia_suficiente')
      }
    } catch(error) {if(error.code==='CACHE_MISS')throw error;warnings.push('erro_audio:'+e.name)}
  }
  if(stats.rar_sem_bpm_audio) warnings.push('rar_compactado_sem_bpm_audio')
  result.erro=[...new Set(warnings)].join('; ')||null
  return {result,unknown,stats,detected,namedEvidence:named.bpm}
}

async function recanais(file,path,item) {
  const audio=audioFiles((await indexArchive(file.read,file.size,/\.rar$/i.test(path)?'rar':'zip')).entries)
  const unknown={}
  for(const e of audio) if(!channel(e.name)) {const name=e.name.split(/[\\/]/).at(-1);unknown[name]=(unknown[name]??0)+1}
  return {...item,unknown,result:{...item.result,qtd_reconhecidos:audio.filter(e=>channel(e.name)).length,canais:[...new Set(audio.map(e=>channel(e.name)).filter(Boolean))]}}
}

export function finalizeSong(items) {
  for(const item of items) {
    if(!item.detected)continue
    // Somente variantes deste slug; nunca usamos o catálogo ou outra música.
    const named=items.filter(other=>other!==item).map(other=>
      Object.hasOwn(other,'namedEvidence')?other.namedEvidence:
        other.result.fonte_bpm==='nome'?other.result.bpm:extractNames([other.result.caminho??'']).bpm).filter(n=>n!==null)
    const resolved=resolveBpm(item.detected,named)
    Object.assign(item.result,{bpm:resolved.bpm,fonte_bpm:resolved.source,
      confianca_bpm:resolved.confidence,bpm_alternativas:resolved.ambiguity})
    if(resolved.bpm===null&&resolved.ambiguity.length) {
      item.result.erro=[item.result.erro,'bpm_ambiguo'].filter(Boolean).join('; ')
    }
  }
}

async function outputs(data,unknown) {
  await mkdir(join(root,'data'),{recursive:true})
  await writeFile(join(root,'data/levantamento.json'),JSON.stringify(data,null,2)+'\n')
  const columns=['slug','caminho','bpm','fonte_bpm','bpm_alternativas','tom','fonte_tom','duracao_seg','canais','qtd_arquivos','confianca_bpm','erro']
  await writeFile(join(root,'tasks/levantamento-musicas.csv'),csv([columns,...Object.entries(data).flatMap(([slug,v])=>
    v.arquivos.map(a=>columns.map(c=>c==='slug'?slug:Array.isArray(a[c])?a[c].join(' | '):a[c])))]))
  await writeFile(join(root,'tasks/levantamento-nao-reconhecidos.csv'),csv([['nome','ocorrencias'],...Object.entries(unknown).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))]))
}

export async function main(args=process.argv.slice(2),directory=checkpointDir,connect=connectB2) {
  const opt=options(args),start=Date.now()
  const cache=await openCache(directory,opt.reprocess)
  // No modo offline nem construímos o cliente: zero autorização, HEAD ou Range.
  const b2=opt.reprocess?null:await connect(),map=opt.reprocess?cache.map:await b2.map()
  if(!map)throw new Error('cache_incompleto: mapa ausente')
  let slugs=opt.slugs??(opt.pilot?selectPilot(map):opt.reprocess?cache.selection:Object.keys(map).sort())
  if(opt.limit) slugs=slugs.slice(0,opt.limit)
  const data={},unknown={},stats={rar_store:0,rar_compactado:0,rar_arquivos_store:0,rar_arquivos_compactados:0,rar_sem_bpm_audio:0}
  if(!opt.reprocess)await cache.setSelection(map,slugs)
  let completed=0,cached=0
  for(const slug of slugs) {
    const items=[]
    data[slug]={arquivos:[]}
    if(!map[slug]) {
      data[slug].arquivos.push({caminho:null,bpm:null,tom:null,duracao_seg:null,canais:[],qtd_arquivos:null,qtd_reconhecidos:null,
        fonte_bpm:null,fonte_tom:null,confianca_bpm:null,bpm_alternativas:[],erro:'slug_ausente_no_mapa'})
      continue
    }
    for(const path of map[slug]) {
      let item=opt.reprocess?null:cache.result(path)
      if(item) {
        cached++
        // Canais saem do índice já guardado: mudar a tabela de nomes não exige baixar nem recalcular o BPM.
        if(item.result.qtd_arquivos!==null) item=await recanais(await cache.open(path),path,item)
      }
      else try {
        const before=b2?.bytes??0
        const file=await cache.open(path,b2?await b2.open(path):undefined)
        item=await survey(file,path)
        if((b2?.bytes??0)===before)cached++
        // Cópia: o finalizeSong altera item.result depois.
        if(!opt.reprocess)await cache.setResult(path,structuredClone(item))
      } catch(error) {
        if(error.code==='CACHE_MISS')throw error
        item={result:{caminho:path,bpm:null,tom:null,duracao_seg:null,canais:[],qtd_arquivos:null,qtd_reconhecidos:null,
          fonte_bpm:null,fonte_tom:null,confianca_bpm:null,bpm_alternativas:[],erro:'erro_acesso'},unknown:{},stats:{}}
      }
      item.result.qtd_reconhecidos??=null
      items.push(item)
      data[slug].arquivos.push(item.result)
      for(const [name,n] of Object.entries(item.unknown))unknown[name]=(unknown[name]??0)+n
      for(const key of Object.keys(stats))stats[key]+=item.stats[key]??0
      completed++
      process.stdout.write(`${completed} arquivos; ${((b2?.bytes??0)/1e6).toFixed(2)} MB\n`)
    }
    finalizeSong(items)
  }
  await outputs(data,unknown)
  const seconds=(Date.now()-start)/1000,total=Object.values(map).reduce((n,a)=>n+a.length,0)
  const summary={slugs:slugs.length,arquivos:completed,reutilizados:cached,...stats,mb_baixados:(b2?.bytes??0)/1e6,segundos:seconds,
    estimativa:cached||!completed?null:{arquivos:total,mb:(b2?.bytes??0)/1e6/completed*total,segundos:seconds/completed*total}}
  await writeFile(join(directory,'resumo.json'),JSON.stringify(summary,null,2))
  process.stdout.write(JSON.stringify(summary,null,2)+'\n')
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().catch(error=>{process.stderr.write(`Levantamento interrompido: ${error.message}\n`);process.exitCode=1})
}
