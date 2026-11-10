# Confere o token do usuario do sistema e o token da Pagina SEM mostrar nenhum token.
# Uso (no seu PowerShell): powershell -ExecutionPolicy Bypass -File C:\dev\tv-instagram\scripts\instagram-conferir-token.ps1
# Nao grava nada em lugar nenhum: os tokens ficam so na memoria e sao apagados no fim.
$ErrorActionPreference = 'Stop'
$versao = 'v26.0'
$pagina = '1368656562994626'
$igEsperado = '17841429323970363'
$base = "https://graph.facebook.com/$versao"

function Ler-Segredo($pergunta) {
  $seguro = Read-Host $pergunta -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Chamar($url, $token) {
  try {
    return Invoke-RestMethod -Uri $url -Headers @{ Authorization = "Bearer $token" } -Method Get
  } catch {
    $corpo = $null
    # PowerShell 5.1 guarda o corpo da resposta de erro em ErrorDetails; o stream ja vem lido.
    try { $corpo = $_.ErrorDetails.Message | ConvertFrom-Json } catch {}
    if (-not $corpo) { try { $corpo = (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() | ConvertFrom-Json } catch {} }
    if (-not $corpo) { Write-Host ('  ERRO: {0}' -f $_.Exception.Message) -ForegroundColor Red; return $null }
    if ($corpo.error) { Write-Host ("  ERRO da Meta: {0} (codigo {1})" -f $corpo.error.message, $corpo.error.code) -ForegroundColor Red }
    else { Write-Host '  ERRO de rede ao chamar a Meta.' -ForegroundColor Red }
    return $null
  }
}

function Data($segundos) {
  if (-not $segundos -or $segundos -eq 0) { return 'nunca' }
  return [DateTimeOffset]::FromUnixTimeSeconds([int64]$segundos).ToLocalTime().ToString('dd/MM/yyyy HH:mm')
}

$tokUsuario = Ler-Segredo 'Cole o token do usuario do sistema (nao aparece na tela)'
$tokUsuario = ($tokUsuario -replace '\s', '')
$tokPagina = $null
try {
  Write-Host ("`n0) Token do usuario: {0} caracteres, comeca com '{1}'" -f $tokUsuario.Length, $(if ($tokUsuario.Length -ge 4) { $tokUsuario.Substring(0, 4) } else { '' }))
  $eu = Chamar "$base/me?fields=id,name" $tokUsuario
  if ($eu) { Write-Host ('  /me: {0} ({1})' -f $eu.name, $eu.id) }
  $du = Chamar "$base/debug_token?input_token=$tokUsuario" $tokUsuario
  if ($du) {
    $x = $du.data
    Write-Host ('  valido: {0}; tipo: {1}; app: {2} ({3}); expira: {4}' -f $x.is_valid, $x.type, $x.application, $x.app_id, (Data $x.expires_at))
    foreach ($g in $x.granular_scopes) { Write-Host ('  {0}: {1}' -f $g.scope, $(if ($g.target_ids) { $g.target_ids -join ', ' } else { 'todos' })) }
  }
  Write-Host "`n1) Pagina $pagina"
  $p = Chamar "$base/$pagina`?fields=access_token,instagram_business_account" $tokUsuario
  if ($p) {
    $tokPagina = $p.access_token
    Write-Host ('  veio access_token: {0}' -f $(if ($tokPagina) { 'SIM' } else { 'NAO' }))
    $ig = $p.instagram_business_account.id
    $ok = if ($ig -eq $igEsperado) { '(certo)' } else { "(ERRADO, esperado $igEsperado)" }
    Write-Host ('  instagram_business_account: {0} {1}' -f $ig, $ok)
  }

  if ($tokPagina) {
    Write-Host "`n2) debug_token do token da Pagina"
    $d = Chamar "$base/debug_token?input_token=$tokPagina" $tokUsuario
    if ($d) {
      $x = $d.data
      Write-Host ('  valido: {0}' -f $x.is_valid)
      Write-Host ('  tipo: {0}' -f $x.type)
      Write-Host ('  app: {0} ({1})' -f $x.application, $x.app_id)
      Write-Host ('  pagina do token: {0}' -f $x.profile_id)
      Write-Host ('  expira: {0}' -f (Data $x.expires_at))
      Write-Host ('  acesso a dados expira: {0}' -f (Data $x.data_access_expires_at))
      Write-Host ('  escopos: {0}' -f ($x.scopes -join ', '))
    }

    Write-Host "`n3) Inscricao do app na Pagina (so leitura, para saber se o webhook vai poder ser ligado)"
    $s = Chamar "$base/$pagina/subscribed_apps" $tokPagina
    if ($s) {
      if ($s.data.Count -eq 0) { Write-Host '  leitura OK; nenhum app inscrito ainda (normal neste ponto)' }
      foreach ($a in $s.data) { Write-Host ('  app inscrito: {0} ({1}) campos: {2}' -f $a.name, $a.id, ($a.subscribed_fields -join ', ')) }
    }
  }
} finally {
  $tokUsuario = $null; $tokPagina = $null
  [GC]::Collect()
}
Write-Host "`nPronto. Nenhum token foi mostrado nem gravado."
