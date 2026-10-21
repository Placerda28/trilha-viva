import test from 'node:test'
import assert from 'node:assert/strict'
import { connectB2 } from '../../scripts/levantamento/b2.mjs'

test('B2 exige Range exato e recusa resposta inteira antes de ler o corpo',async()=>{
  const originalFetch=globalThis.fetch
  const originalId=process.env.B2_KEY_ID, originalKey=process.env.B2_APP_KEY
  process.env.B2_KEY_ID='teste-local';process.env.B2_APP_KEY='teste-local'
  let mode='ok',cancelled=false,called=0
  globalThis.fetch=async(url,options)=>{
    if(url.endsWith('b2_authorize_account')) return Response.json({authorizationToken:'teste-local',apiInfo:{storageApi:{downloadUrl:'https://b2.invalid'}}})
    if(options.method==='HEAD') return new Response(null,{headers:{'content-length':'1000',etag:'versao-teste'}})
    called++
    assert.equal(options.headers.Range,'bytes=10-19')
    assert.equal(options.headers['If-Match'],'versao-teste')
    if(mode==='inteiro') return {ok:true,status:200,body:{cancel:async()=>{cancelled=true}}}
    return new Response(Buffer.alloc(10),{status:206,headers:{'content-range':mode==='errado'?'bytes 11-20/1000':'bytes 10-19/1000'}})
  }
  try {
    const b2=await connectB2(),file=await b2.open('a.zip')
    assert.equal((await file.read(10,10)).length,10)
    assert.equal(b2.bytes,10)
    await assert.rejects(file.read(0,1000),/arquivo_inteiro_recusado/)
    assert.equal(called,1)
    mode='inteiro';await assert.rejects(file.read(10,10),/range_nao_respeitado/)
    assert.equal(cancelled,true)
    mode='errado';await assert.rejects(file.read(10,10),/range_nao_respeitado/)
    assert.equal(b2.bytes,10)
  } finally {
    globalThis.fetch=originalFetch
    if(originalId===undefined)delete process.env.B2_KEY_ID;else process.env.B2_KEY_ID=originalId
    if(originalKey===undefined)delete process.env.B2_APP_KEY;else process.env.B2_APP_KEY=originalKey
  }
})
