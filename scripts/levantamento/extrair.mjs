import { createInflateRaw, constants } from 'node:zlib'

export async function entryPrefix(file, entry, compressedLimit, outputLimit=64*1024*1024) {
  if (entry.encrypted || entry.solid || entry.multipart) throw new Error('entrada_protegida_solid_ou_multivolume')
  if (!['store','deflate'].includes(entry.method)) throw new Error('audio_compactado_nao_suportado')
  let offset=entry.dataOffset
  if (offset == null) {
    const local=await file.read(entry.offset,30)
    if(local.readUInt32LE(0)!==0x04034b50) throw new Error('cabecalho_local_zip_invalido')
    if(local.readUInt16LE(6)&1) throw new Error('entrada_criptografada')
    offset=entry.offset+30+local.readUInt16LE(26)+local.readUInt16LE(28)
  }
  const length=Math.min(entry.compressedSize,compressedLimit)
  if(!length) return Buffer.alloc(0)
  const input=await file.read(offset,length)
  if(entry.method==='store') return input.subarray(0,outputLimit)
  return new Promise((resolve,reject)=>{
    const inflate=createInflateRaw({finishFlush:constants.Z_SYNC_FLUSH})
    const chunks=[];let size=0, done=false
    const finish=()=>{if(!done){done=true;resolve(Buffer.concat(chunks));inflate.destroy()}}
    inflate.on('data',chunk=>{
      const part=chunk.subarray(0,outputLimit-size);chunks.push(part);size+=part.length
      if(size>=outputLimit) finish()
    })
    inflate.on('end',finish)
    inflate.on('error',()=>{if(!done)reject(new Error('deflate_invalido'))})
    inflate.end(input)
  })
}
