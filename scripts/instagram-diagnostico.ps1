# Diagnostico do Direct: a API enxerga as conversas? Qual app esta inscrito na Pagina? Nao mostra token.
# Uso (no seu PowerShell): powershell -ExecutionPolicy Bypass -File C:\dev\tv-instagram\scripts\instagram-diagnostico.ps1
$ErrorActionPreference = 'Stop'
$base = 'https://graph.facebook.com/v26.0'
$pagina = '1368656562994626'
$ig = '17841429323970363'

function ErroMeta($e) {
  try { $c = $e.ErrorDetails.Message | ConvertFrom-Json; return ('{0} (codigo {1}/{2})' -f $c.error.message, $c.error.code, $c.error.error_subcode) } catch { return $e.Exception.Message }
}
function Get($url, $tok, $rotulo) {
  try { return Invoke-RestMethod -Uri $url -Headers @{ Authorization = "Bearer $tok" } }
  catch { Write-Host ('  {0}: ERRO {1}' -f $rotulo, (ErroMeta $_)) -ForegroundColor Red; return $null }
}

$seguro = Read-Host 'Cole o token do usuario do sistema (nao aparece na tela)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
try { $tokUsuario = ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)) -replace '\s', '' } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }

try {
  $tokPagina = (Invoke-RestMethod -Uri "$base/$pagina`?fields=access_token" -Headers @{ Authorization = "Bearer $tokUsuario" }).access_token

  Write-Host "`n1) Conta do Instagram"
  $c = Get "$base/$ig`?fields=username" $tokPagina 'conta'
  if ($c) { Write-Host ('  @{0}' -f $c.username) }

  Write-Host "`n2) Conversas do Direct que a API enxerga (ultimas 5)"
  $conv = Get "$base/$pagina/conversations?platform=instagram&limit=5&fields=updated_time,participants,messages.limit(1){from,created_time}" $tokPagina 'conversas'
  if ($conv) {
    if ($conv.data.Count -eq 0) { Write-Host '  nenhuma conversa visivel' }
    foreach ($x in $conv.data) {
      $quem = ($x.participants.data | Where-Object { $_.id -ne $ig } | ForEach-Object { '@' + $_.username }) -join ', '
      $ult = $x.messages.data[0]
      Write-Host ('  {0} | atualizada {1} | ultima de @{2} (id {3})' -f $quem, $x.updated_time, $ult.from.username, $ult.from.id)
    }
  }

  Write-Host "`n3) Apps inscritos na Pagina"
  $s = Get "$base/$pagina/subscribed_apps" $tokPagina 'inscricao'
  if ($s) { foreach ($a in $s.data) { Write-Host ('  {0} ({1}) campos: {2}' -f $a.name, $a.id, ($a.subscribed_fields -join ', ')) } }
} catch {
  Write-Host ('ERRO: {0}' -f (ErroMeta $_)) -ForegroundColor Red
} finally {
  $tokUsuario = $null; $tokPagina = $null
  [GC]::Collect()
}
Write-Host "`nPronto. Nenhum token foi mostrado nem gravado."
