import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

const hash=value=>createHash('sha256').update(value).digest('hex')
function missing(detail) {return Object.assign(new Error('cache_incompleto: '+detail),{code:'CACHE_MISS'})}
export async function openCache(directory,offline) {
  const checkpoint=join(directory,'progresso.json')
  let state
  try {state=JSON.parse(await readFile(checkpoint,'utf8'))}
  catch(error) {if(error.code!=='ENOENT')throw error}
  if(state?.version!==2) {
    if(offline) throw missing(state?'cache_antigo_sem_indices_e_audio; faça uma coleta com rede':'checkpoint_ausente')
    state={version:2,map:null,selection:[],archives:{}}
  }
  async function save() {
    await mkdir(directory,{recursive:true})
    await writeFile(checkpoint+'.tmp',JSON.stringify(state))
    await rename(checkpoint+'.tmp',checkpoint)
  }
  async function bytes(name) {
    try {return await readFile(join(directory,name))}
    catch(error) {if(error.code==='ENOENT')throw missing(name);throw error}
  }
  async function put(name,buffer) {
    await mkdir(directory,{recursive:true})
    await writeFile(join(directory,name)+'.tmp',buffer)
    await rename(join(directory,name)+'.tmp',join(directory,name))
  }
  return {
    get map(){return state.map}, get selection(){return state.selection},
    async setSelection(map,selection){state.map=map;state.selection=selection;await save()},
    async open(path,remote) {
      let item=state.archives[path]
      if(remote&&(!item||item.size!==remote.size||item.etag!==remote.etag)) {
        item={size:remote.size,etag:remote.etag,ranges:[],pcm:{},metadata:{}}
        state.archives[path]=item;await save()
      }
      if(!item)throw missing(path)
      const id=hash(JSON.stringify([path,item.size,item.etag]))
      return {size:item.size,etag:item.etag,
        async read(start,length) {
          if(!Number.isSafeInteger(start)||!Number.isSafeInteger(length)||start<0||length<1||start+length>item.size)throw new Error('range_cache_invalido')
          const chunks=[];let position=start
          while(position<start+length) {
            const hit=item.ranges.find(r=>r.start<=position&&r.start+r.length>position)
            if(hit) {
              const buffer=await bytes(hit.file)
              if(buffer.length!==hit.length)throw missing('range_corrompido')
              const end=Math.min(start+length,hit.start+hit.length)
              chunks.push(buffer.subarray(position-hit.start,end-hit.start));position=end
            } else {
              if(offline||!remote)throw missing(`${path} bytes ${position}`)
              const next=Math.min(start+length,...item.ranges.filter(r=>r.start>position).map(r=>r.start))
              const buffer=await remote.read(position,next-position)
              if(buffer.length!==next-position)throw new Error('range_cache_incompleto')
              const name=`${id}-${position}-${buffer.length}.bin`
              await put(name,buffer)
              item.ranges.push({start:position,length:buffer.length,file:name});await save()
              chunks.push(buffer);position=next
            }
          }
          return Buffer.concat(chunks)
        },
        async metadata(key,loader) {
          if(Object.hasOwn(item.metadata,key))return item.metadata[key]
          const value=await loader()
          item.metadata[key]=value;await save();return value
        },
        async pcm(key,loader) {
          const hit=item.pcm[key]
          if(hit) {
            const buffer=await bytes(hit.file)
            if(buffer.length!==hit.count*4)throw missing('pcm_corrompido')
            const samples=new Float32Array(hit.count)
            for(let i=0;i<samples.length;i++)samples[i]=buffer.readFloatLE(i*4)
            return {samples,sampleRate:hit.sampleRate}
          }
          // Um prefixo compactado já guardado também pode preencher o PCM sem rede.
          const decoded=await loader()
          if(!decoded)return null
          const buffer=Buffer.alloc(decoded.samples.length*4)
          for(let i=0;i<decoded.samples.length;i++)buffer.writeFloatLE(decoded.samples[i],i*4)
          const name=`${id}-${hash(key)}.pcm`
          await put(name,buffer)
          item.pcm[key]={file:name,count:decoded.samples.length,sampleRate:decoded.sampleRate};await save()
          return decoded
        },
      }
    },
  }
}
