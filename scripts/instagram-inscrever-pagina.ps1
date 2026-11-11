# Inscreve o app na Pagina (POST /{PAGE_ID}/subscribed_apps) para o Direct do Instagram chegar no webhook. Nao mostra token.
# Uso (no seu PowerShell): powershell -ExecutionPolicy Bypass -File C:\dev\tv-instagram\scripts\instagram-inscrever-pagina.ps1
$ErrorActionPreference = 'Stop'
$base = 'https://graph.facebook.com/v26.0'
$pagina = '1368656562994626'

function ErroMeta($e) {
  try { $c = $e.ErrorDetails.Message | ConvertFrom-Json; return ('{0} (codigo {1})' -f $c.error.message, $c.error.code) } catch { return $e.Exception.Message }
}

$seguro = Read-Host 'Cole o token do usuario do sistema (nao aparece na tela)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
try { $tokUsuario = ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)) -replace '\s', '' } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }

try {
  $tokPagina = (Invoke-RestMethod -Uri "$base/$pagina`?fields=access_token" -Headers @{ Authorization = "Bearer $tokUsuario" }).access_token
  if (-not $tokPagina) { throw 'A Meta nao devolveu o token da Pagina.' }
  $h = @{ Authorization = "Bearer $tokPagina" }
  # 'messages' e o campo certo; se a Meta exigir pages_messaging para ele, 'feed' tambem liga a inscricao da Pagina.
  $inscrito = $false
  foreach ($campos in @('messages', 'feed')) {
    try {
      $r = Invoke-RestMethod -Method Post -Uri "$base/$pagina/subscribed_apps?subscribed_fields=$campos" -Headers $h
      Write-Host ('Inscricao com "{0}": {1}' -f $campos, $(if ($r.success) { 'OK' } else { 'sem sucesso' }))
      if ($r.success) { $inscrito = $true; break }
    } catch { Write-Host ('Inscricao com "{0}" recusada: {1}' -f $campos, (ErroMeta $_)) -ForegroundColor Yellow }
  }
  $s = Invoke-RestMethod -Uri "$base/$pagina/subscribed_apps" -Headers $h
  foreach ($a in $s.data) { Write-Host ('App inscrito: {0} ({1}) campos: {2}' -f $a.name, $a.id, ($a.subscribed_fields -join ', ')) }
  if (-not $inscrito) { Write-Host 'Nenhuma inscricao funcionou. Mande esta saida para o Claude.' -ForegroundColor Red }
} catch {
  Write-Host ('ERRO: {0}' -f (ErroMeta $_)) -ForegroundColor Red
} finally {
  $tokUsuario = $null; $tokPagina = $null; $h = $null
  [GC]::Collect()
}
Write-Host 'Pronto. Nenhum token foi mostrado nem gravado.'
