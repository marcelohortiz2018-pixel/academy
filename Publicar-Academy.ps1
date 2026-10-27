# Publica a plataforma HortiZ Academy no GitHub Pages (gratuito). Pode rodar de novo a cada atualizacao.
$ErrorActionPreference = "Stop"
$owner = "marcelohortiz2018-pixel"; $nome = "hortiz-academy"; $repo = "$owner/$nome"
$site = Join-Path $PSScriptRoot "site"
function Fim($m){ Write-Host ""; Write-Host $m; Read-Host "Pressione Enter para fechar"; exit }
function Falhou($e){ if($LASTEXITCODE -ne 0){ Fim "ERRO em: $e. Veja a mensagem acima." } }
foreach ($p in @(@{cmd="gh";id="GitHub.cli"}, @{cmd="git";id="Git.Git"})) {
  if (-not (Get-Command $p.cmd -ErrorAction SilentlyContinue)) {
    try { winget install --id $p.id -e --accept-source-agreements --accept-package-agreements } catch {}
    $env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
    if (-not (Get-Command $p.cmd -ErrorAction SilentlyContinue)) { Fim "Instale o $($p.cmd) e rode de novo." }
  }
}
gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { gh auth login --web --git-protocol https; Falhou "login no GitHub" }
gh auth setup-git | Out-Null
gh repo view $repo 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Host "Criando o repositorio $repo ..."; gh repo create $repo --public --description "HortiZ Academy - onboarding" ; Falhou "criar repositorio" }
$tmp = Join-Path $env:TEMP ("academy-" + [guid]::NewGuid().ToString("N").Substring(0,8))
gh repo clone $repo $tmp -- --quiet 2>$null
if (-not (Test-Path $tmp)) { New-Item -ItemType Directory $tmp | Out-Null; Push-Location $tmp; git init -b main | Out-Null; git remote add origin "https://github.com/$repo.git"; Pop-Location }
Get-ChildItem -LiteralPath $tmp -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force
Copy-Item -Path (Join-Path $site "*") -Destination $tmp -Recurse -Force
Copy-Item -LiteralPath (Join-Path $site ".nojekyll") -Destination $tmp -Force
Push-Location $tmp
git add -A
git -c user.name="HortiZ & Co" -c user.email="marcelohortiz@hotmail.com" commit -m ("Atualiza Academy " + (Get-Date -Format "yyyy-MM-dd HH:mm")) --quiet
git branch -M main
git push -u origin main --quiet
Falhou "enviar arquivos"
Pop-Location
gh api -X POST "repos/$repo/pages" -f "source[branch]=main" -f "source[path]=/" 2>$null | Out-Null
Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
Fim "PRONTO!`nEndereco: https://$owner.github.io/$nome/  (pode levar 1 a 2 minutos na primeira vez)"
