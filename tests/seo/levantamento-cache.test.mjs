import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openCache } from '../../scripts/levantamento/cache.mjs'
import { survey, finalizeSong, main, options } from '../../scripts/levantamento/rodar.mjs'

test('cache conserva bytes e PCM e reprocessa sem qualquer acesso remoto',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'tv-cache-test-'))
  try {
    const cache=await openCache(dir,false)
    await cache.setSelection({musica:['a.zip']},['musica'])
    let requests=0
    const remote={size:1000,etag:'v1',read:async(start,length)=>{requests++;return Buffer.alloc(length,start)}}
    const file=await cache.open('a.zip',remote)
    assert.deepEqual(await file.read(20,10),Buffer.alloc(10,20))
    assert.equal((await file.read(22,3))[0],20)
    assert.equal(requests,1)
    const pcm=await file.pcm('click.wav',async()=>({sampleRate:8000,samples:new Float32Array([0,0.5,-0.5])}))
    assert.equal(pcm.sampleRate,8000)
    const offline=await openCache(dir,true), again=await offline.open('a.zip')
    assert.deepEqual(await again.read(20,10),Buffer.alloc(10,20))
    assert.deepEqual([...(await again.pcm('click.wav',()=>assert.fail('não decodificar novamente'))).samples],[0,0.5,-0.5])
    await assert.rejects(again.read(50,10),{code:'CACHE_MISS'})
    assert.equal(requests,1)
    assert.equal(JSON.parse(await readFile(join(dir,'progresso.json'))).version,2)
  } finally {await rm(dir,{recursive:true,force:true})}
})
test('cache antigo não permite reprocessar nem modifica checkpoint',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'tv-cache-test-'))
  try {
    const old=JSON.stringify({version:1,files:{}})
    await writeFile(join(dir,'progresso.json'),old)
    await assert.rejects(openCache(dir,true),/cache_antigo/)
    await assert.rejects(main(['--reprocessar'],dir,()=>assert.fail('não conectar')),/cache_antigo/)
    assert.equal(await readFile(join(dir,'progresso.json'),'utf8'),old)
  } finally {await rm(dir,{recursive:true,force:true})}
})

test('desempate usa apenas variantes fornecidas da mesma música, independente da ordem',()=>{
  const click=()=>({result:{caminho:'Central.zip',bpm:null,erro:null},
    detected:{bpm:null,confidence:1,ambiguity:[68.5,137],candidates:[68.5,137]}})
  const a=click(),b=click(),named={result:{caminho:'Central - 137bpm.rar',bpm:137,fonte_bpm:'nome'}}
  finalizeSong([a,b,named])
  assert.equal(a.result.bpm,137);assert.equal(b.result.fonte_bpm,'clique+nome')
  const other=click();finalizeSong([other])
  assert.equal(other.result.bpm,null)
  assert.deepEqual(other.result.bpm_alternativas,[68.5,137])
  const nada={result:{caminho:'Nada.zip',erro:null},detected:{bpm:null,confidence:1,ambiguity:[72,144],candidates:[72,144]}}
  finalizeSong([nada,{result:{caminho:'Nada - 77bpm.zip',bpm:77,fonte_bpm:'nome'}}])
  assert.equal(nada.result.bpm,null)
  assert.equal(nada.result.fonte_bpm,null)
  assert.equal(options(['--reprocessar']).reprocess,true)
})

function zipClick() {
  const rate=1000,seconds=85,wav=Buffer.alloc(44+rate*seconds*2)
  wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVE',8)
  wav.write('fmt ',12);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22)
  wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34)
  wav.write('data',36);wav.writeUInt32LE(wav.length-44,40)
  for(let beat=0;beat<100;beat++) {
    const start=Math.round((1+beat*60/72)*rate)
    for(let j=0;j<10&&start+j<rate*seconds;j++)wav.writeInt16LE(Math.round(20000*Math.exp(-j/3)),44+(start+j)*2)
  }
  const name=Buffer.from('click.wav'),local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22)
  local.writeUInt32LE(0x04034b50);local.writeUInt16LE(name.length,26)
  central.writeUInt32LE(0x02014b50);central.writeUInt32LE(wav.length,20);central.writeUInt32LE(wav.length,24);central.writeUInt16LE(name.length,28)
  end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10)
  end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(local.length+name.length+wav.length,16)
  return Buffer.concat([local,name,wav,central,name,end])
}
test('índice e clique sintéticos produzem resultado idêntico no cache offline',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'tv-cache-test-'))
  try {
    const zip=zipClick(),cache=await openCache(dir,false)
    let reads=0
    const remote={size:zip.length,etag:'sintetico',read:async(start,length)=>{reads++;return zip.subarray(start,start+length)}}
    const first=await survey(await cache.open('musica.zip',remote),'musica.zip')
    assert.deepEqual(first.result.canais,['Clique'])
    assert.equal(first.result.duracao_seg,85)
    assert.deepEqual(first.detected.ambiguity,[72,144])
    const count=reads,offline=await openCache(dir,true)
    const second=await survey(await offline.open('musica.zip'),'musica.zip')
    assert.deepEqual(second,first)
    assert.equal(reads,count)
  } finally {await rm(dir,{recursive:true,force:true})}
})
