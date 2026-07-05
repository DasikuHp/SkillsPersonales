#Requires -Version 5.1
<#
  EGO OS - desinstalador (reversible). Lee el manifest que dejo install.ps1, borra los ficheros que
  EGO OS anadio, restaura el backup de settings.json y quita el bloque kernel de ~/.claude/CLAUDE.md.
  NO borra ~/.claude/engines-build salvo -Purge. NO toca skills/hooks previos tuyos.

  Uso:
    ./uninstall.ps1            # revierte la ultima instalacion (segun manifest)
    ./uninstall.ps1 -DryRun    # muestra que haria
    ./uninstall.ps1 -Purge     # ademas borra ~/.claude/engines-build (sentinels/binarios)
    ./uninstall.ps1 -NoMcp     # no intenta quitar el registro MCP de codebase-memory
#>
[CmdletBinding()]
param([switch]$DryRun, [switch]$Purge, [switch]$NoMcp)

$ErrorActionPreference = 'Stop'
$CC = Join-Path $env:USERPROFILE '.claude'
$Manifest = Join-Path $CC 'ego-os.manifest.json'
function Say([string]$m, [string]$c = 'Gray') { Write-Host $m -ForegroundColor $c }
function Head([string]$m) { Write-Host ""; Write-Host "== $m ==" -ForegroundColor Cyan }

if (-not (Test-Path $Manifest)) { throw "No hay manifest en $Manifest. Instalaste con install.ps1?" }
$man = Get-Content $Manifest -Raw | ConvertFrom-Json
Say "Manifest: instalado $($man.ts), $($man.installed.Count) ficheros. Backup: $($man.backup)"
if ($DryRun) { Say "[DryRun] no se borra nada." 'Magenta' }

Head "Quitar ficheros EGO OS anadidos"
foreach ($rel in $man.installed) {
  $p = Join-Path $CC $rel
  if (Test-Path $p) {
    if (-not $DryRun) { Remove-Item -LiteralPath $p -Force }
    Say "  - $rel"
  }
}
foreach ($d in @('skills','agents','commands','hooks','rules','mcp-launchers')) {
  $dir = Join-Path $CC $d
  if ((Test-Path $dir) -and -not $DryRun) {
    Get-ChildItem $dir -Recurse -Directory | Sort-Object { $_.FullName.Length } -Descending | ForEach-Object {
      if (-not (Get-ChildItem $_.FullName -Force)) { Remove-Item $_.FullName -Force }
    }
  }
}

Head "Quitar hooks EGO de settings.json (por nombre, no destruye caveman ni otros)"
$settingsPath = Join-Path $CC 'settings.json'
$egoHookNames = @('post-tool-use.mjs','stop.mjs','session-start.mjs','user-prompt-submit.mjs')
if (Test-Path $settingsPath) {
  $s = Get-Content $settingsPath -Raw | ConvertFrom-Json
  $removed = 0
  if ($s.PSObject.Properties['hooks']) {
    foreach ($event in @('PostToolUse','Stop','SessionStart','UserPromptSubmit')) {
      if ($s.hooks.PSObject.Properties[$event]) {
        $kept = @()
        foreach ($grp in @($s.hooks.$event)) {
          $isEgo = $false
          foreach ($h in @($grp.hooks)) { foreach ($nm in $egoHookNames) { if ($h.command -like "*$nm*") { $isEgo = $true } } }
          if ($isEgo) { $removed++ } else { $kept += $grp }
        }
        if ($kept.Count -gt 0) { $s.hooks.$event = $kept } else { $s.hooks.PSObject.Properties.Remove($event) }
      }
    }
  }
  if (-not $DryRun -and $removed -gt 0) { $s | ConvertTo-Json -Depth 20 | Set-Content -Path $settingsPath -Encoding UTF8 }
  Say "  hooks EGO quitados de settings.json: $removed (caveman/otros intactos)" 'Green'
} else { Say "  no hay settings.json." 'DarkYellow' }

Head "Quitar bloque kernel de ~/.claude/CLAUDE.md"
$ccMd = Join-Path $CC 'CLAUDE.md'
if (Test-Path $ccMd) {
  $beg = '<!-- BEGIN EGO-OS KERNEL (managed by install.ps1) -->'
  $end = '<!-- END EGO-OS KERNEL -->'
  $cur = Get-Content $ccMd -Raw
  if ($cur -match [regex]::Escape($beg)) {
    $pattern = "(?s)\s*" + [regex]::Escape($beg) + ".*?" + [regex]::Escape($end)
    $new = [regex]::Replace($cur, $pattern, '')
    if (-not $DryRun) { Set-Content -Path $ccMd -Value $new.Trim() -Encoding UTF8 }
    Say "  bloque kernel eliminado" 'Green'
  } else { Say "  sin bloque kernel." }
}

Head "MCP"
if ($NoMcp) { Say "  omitido (-NoMcp)." }
elseif (Get-Command claude -ErrorAction SilentlyContinue) {
  if (-not $DryRun) { try { & claude mcp remove -s user codebase-memory 2>&1 | Out-Null; Say "  quitado registro codebase-memory (si existia)" } catch {} }
  Say "  ego-memory/ego-simbionte/ego-toolbelt NO se tocan (los provee tu plugin ego)." 'DarkYellow'
} else { Say "  claude CLI ausente; nada que quitar." }

Head "engines-build"
$eng = Join-Path $CC 'engines-build'
if ($Purge) {
  if ((Test-Path $eng) -and -not $DryRun) { Remove-Item $eng -Recurse -Force }
  Say "  -Purge: eliminado $eng (sentinels/binarios)." 'Yellow'
} else { Say "  conservado $eng (usa -Purge para borrarlo)." }

if (-not $DryRun) { Remove-Item $Manifest -Force }
Write-Host ""
Say "EGO OS desinstalado. Tu setup previo (plugin ego, caveman, skills propias) queda intacto." 'Cyan'
