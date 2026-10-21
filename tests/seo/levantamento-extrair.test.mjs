import test from 'node:test'
import assert from 'node:assert/strict'
import { deflateRawSync } from 'node:zlib'
import { entryPrefix } from '../../scripts/levantamento/extrair.mjs'
import { options } from '../../scripts/levantamento/rodar.mjs'

test('extrai prefixo store/deflate sem ler o restante e limita descompressão', async()=>{
  const source=Buffer.alloc(100000,42)
  for(const method of ['store','deflate']) {
    const packed=method==='store'?source:deflateRawSync(source)
    const requests=[]
    const file={read:async(start,length)=>{requests.push([start,length]);return packed.subarray(start,start+length)}}
    const entry={method,dataOffset:0,compressedSize:packed.length}
    const prefix=await entryPrefix(file,entry,Math.floor(packed.length/2),1000)
    assert.ok(prefix.length>0&&prefix.length<=1000)
    assert.ok(prefix.every(v=>v===42))
    assert.equal(requests.length,1)
    assert.ok(requests[0][1]<packed.length)
  }
})
test('nunca extrai entrada cifrada, solid ou multivolume', async()=>{
  for(const flag of ['encrypted','solid','multipart']) {
    await assert.rejects(entryPrefix({read:()=>assert.fail('não pode ler')},{[flag]:true},100))
  }
})
test('execução sem seleção explícita é recusada',()=>{
  assert.throws(()=>options([]))
  assert.throws(()=>options(['--limite','0']))
  assert.throws(()=>options(['--piloto','--slugs','a']))
  assert.equal(options(['--limite','3']).limit,3)
  assert.deepEqual(options(['--slugs','a,b']).slugs,['a','b'])
})
