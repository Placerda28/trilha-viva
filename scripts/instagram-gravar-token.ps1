# Grava o IG_TOKEN (token da PAGINA) no robo (recuperacao-carrinho) e no site (www) SEM mostrar o token.
# Pede o token do usuario do sistema, troca pelo token da Pagina e passa direto para o wrangler pela entrada padrao.
# Uso (no seu PowerShell): powershell -ExecutionPolicy Bypass -File C:\dev\tv-instagram\scripts\instagram-gravar-token.ps1 [-So robo|site]
param([ValidateSet('ambos','robo','site')][string]$So = 'ambos')
$ErrorActionPreference = 'Stop'
$base = 'https://graph.facebook.com/v26.0'
$pagina = '1368656562994626'
$raiz = 'C:\dev\tv-instagram'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { fnm env | Out-String | Invoke-Expression }

$seguro = Read-Host 'Cole o token do usuario do sistema (nao aparece na tela)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
try { $tokUsuario = ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)) -replace '\s', '' } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }

try {
  $p = Invoke-RestMethod -Uri "$base/$pagina`?fields=access_token" -Headers @{ Authorization = "Bearer $tokUsuario" }
  if (-not $p.access_token) { throw 'A Meta nao devolveu o token da Pagina.' }
  $d = (Invoke-RestMethod -Uri "$base/debug_token?input_token=$($p.access_token)" -Headers @{ Authorization = "Bearer $tokUsuario" }).data
  if (-not $d.is_valid -or $d.type -ne 'PAGE' -or $d.profile_id -ne $pagina -or $d.expires_at -ne 0) { throw 'Token da Pagina nao passou na conferencia (tipo/pagina/validade).' }
  Write-Host 'Token da Pagina conferido: PAGE, Pagina certa, nunca expira.'

  # O node passa o token pela entrada padrao (sem quebra de linha, sem arquivo, sem aparecer na tela).
  $env:TV_IG_TOKEN_TEMP = $p.access_token
  $js = @'
const { execSync } = require('child_process')
for (const [nome, pasta] of [['robo', process.argv[1]], ['site', process.argv[2]]].filter(([n]) => process.argv[3] === 'ambos' || process.argv[3] === n)) {
  execSync('npx wrangler secret put IG_TOKEN', { cwd: pasta, input: process.env.TV_IG_TOKEN_TEMP, stdio: ['pipe', 'ignore', 'inherit'], shell: true })
  console.log('IG_TOKEN gravado no ' + nome)
}
'@
  node -e $js "$raiz\workers\recuperacao-carrinho" $raiz $So
  if ($LASTEXITCODE -ne 0) { throw 'O wrangler falhou ao gravar.' }
} catch {
  Write-Host ('ERRO: {0}' -f $_.Exception.Message) -ForegroundColor Red
} finally {
  Remove-Item Env:TV_IG_TOKEN_TEMP -ErrorAction SilentlyContinue
  $tokUsuario = $null; $p = $null
  [GC]::Collect()
}
Write-Host 'Pronto. Nenhum token foi mostrado nem gravado em arquivo.'
