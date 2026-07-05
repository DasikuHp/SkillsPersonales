#Requires -Version 5.1
<#
  EGO OS - instalador Windows (idempotente, aditivo, reversible).

  Filosofia comprobar-primero (rules/40): NO clobbea tu ~/.claude. Hace backup con timestamp,
  copia SOLO las piezas EGO OS de forma aditiva (salta lo identico), registra un manifest para
  desinstalar limpio, y anade solo los hooks net-new (security gate + debug-loop) para no
  duplicar los del plugin ego si ya lo tienes. Ejecutar dos veces = no-op la segunda vez.

  Uso:
    ./install.ps1                 # instala aditivo (recomendado)
    ./install.ps1 -DryRun         # muestra que haria, sin tocar nada
    ./install.ps1 -Force          # re-copia piezas EGO OS aunque existan
    ./install.ps1 -AllHooks       # tambien instala SessionStart/UserPromptSubmit (duplica con plugin ego)
    ./install.ps1 -EnablePxpipe   # persiste opt-in pxpipe (default OFF)
    ./install.ps1 -NoMcp          # no registra MCP servers
    ./install.ps1 -NoDesktop      # no toca la config de Claude Desktop
#>
[CmdletBinding()]
param(
  [switch]$DryRun,
  [switch]$Force,
  [switch]$AllHooks,
  [switch]$EnablePxpipe,
  [switch]$NoMcp,
  [switch]$NoDesktop
)

$ErrorActionPreference = 'Stop'
$Repo = $PSScriptRoot
$CC   = Join-Path $env:USERPROFILE '.claude'
$ts   = Get-Date -Format 'yyyyMMdd-HHmmss'
$Backup   = Join-Path $CC "backups\ego-os-$ts"
$Manifest = Join-Path $CC 'ego-os.manifest.json'
$installed = New-Object System.Collections.Generic.List[string]

function Say([string]$m, [string]$c = 'Gray') { Write-Host $m -ForegroundColor $c }
function Head([string]$m) { Write-Host ""; Write-Host "== $m ==" -ForegroundColor Cyan }

function Backup-One([string]$path) {
  if (-not (Test-Path $path)) { return }
  if (-not $path.StartsWith($CC, [System.StringComparison]::OrdinalIgnoreCase)) { return }
  $rel = $path.Substring($CC.Length).TrimStart('\','/')
  $dst = Join-Path $Backup $rel
  if (-not $DryRun) {
    New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
    Copy-Item -LiteralPath $path -Destination $dst -Force
  }
  Say "  backup: $rel"
}

# Copia aditiva de un arbol del repo a ~/.claude. Salta ficheros identicos (idempotente).
function Install-Tree([string]$srcSub, [string]$dstSub) {
  $src = Join-Path $Repo $srcSub
  if (-not (Test-Path $src)) { return }
  $dstRoot = Join-Path $CC $dstSub
  Get-ChildItem -Path $src -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($src.Length).TrimStart('\','/')
    $dst = Join-Path $dstRoot $rel
    $exists = Test-Path $dst
    $same = $false
    if ($exists) {
      try { $same = (Get-FileHash $_.FullName).Hash -eq (Get-FileHash $dst).Hash } catch { $same = $false }
    }
    $installed.Add((Join-Path $dstSub $rel))   # EGO-managed: se registra para uninstall aunque no se copie
    if ($same) { return }
    if ($exists -and -not $Force) { Say "  skip (existe, usa -Force): $dstSub/$rel" 'DarkYellow'; return }
    if ($exists) { Backup-One $dst }
    if (-not $DryRun) {
      New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
      Copy-Item -LiteralPath $_.FullName -Destination $dst -Force
    }
    Say "  + $dstSub/$rel" 'Green'
  }
}

# ---------------------------------------------------------------------------
Head "EGO OS install - preflight (comprobar-primero, no instala nada pesado)"
$node = (Get-Command node -ErrorAction SilentlyContinue)
$git  = (Get-Command git  -ErrorAction SilentlyContinue)
$py   = (Get-Command python -ErrorAction SilentlyContinue)
$cla  = (Get-Command claude -ErrorAction SilentlyContinue)
Say ("  node   : " + $(if ($node) { (& node --version) } else { 'AUSENTE (requerido para hooks/launchers)' }))
Say ("  git    : " + $(if ($git)  { 'ok' } else { 'ausente (opcional)' }))
Say ("  python : " + $(if ($py)   { "$($py.Source) (no se invoca; los MCP usan el venv del plugin ego)" } else { 'ausente (los MCP usan el venv del plugin ego)' }))
Say ("  claude : " + $(if ($cla)  { 'ok (registro MCP disponible)' } else { 'ausente (se omite registro MCP)' }))
if (-not $node) { throw "node es requerido. Instalalo y reintenta." }
$egoVenv = 'E:\skill\ego\.venv\Scripts\python.exe'
Say ("  ego venv: " + $(if (Test-Path $egoVenv) { "$egoVenv (motores EGO ya presentes -> check-first)" } else { 'no hallado (define EGO_ROOT o clona el plugin)' }))
if ($DryRun) { Say "  [DryRun] no se modificara nada." 'Magenta' }

Head "Backup de settings.json"
if (-not $DryRun) { New-Item -ItemType Directory -Force -Path $Backup | Out-Null }
Backup-One (Join-Path $CC 'settings.json')

Head "Instalar componentes EGO OS (aditivo, salta identicos)"
Install-Tree '.claude/skills'        'skills'
Install-Tree '.claude/agents'        'agents'
Install-Tree '.claude/commands'      'commands'
Install-Tree '.claude/hooks'         'hooks'
Install-Tree '.claude/rules'         'rules'
Install-Tree '.claude/mcp-launchers' 'mcp-launchers'
$ensureSrc = Join-Path $Repo '.claude/ensure.mjs'
$ensureDst = Join-Path $CC 'ensure.mjs'
if (Test-Path $ensureSrc) {
  $installed.Add('ensure.mjs')   # EGO-managed
  if ((Test-Path $ensureDst) -and -not $Force -and ((Get-FileHash $ensureSrc).Hash -eq (Get-FileHash $ensureDst).Hash)) {
    Say "  = ensure.mjs (identico)"
  } else {
    if (Test-Path $ensureDst) { Backup-One $ensureDst }
    if (-not $DryRun) { Copy-Item $ensureSrc $ensureDst -Force }
    Say "  + ensure.mjs" 'Green'
  }
}

Head "Kernel CLAUDE.md (bloque gestionado en ~/.claude/CLAUDE.md)"
$ccMd = Join-Path $CC 'CLAUDE.md'
$kernel = Get-Content (Join-Path $Repo 'CLAUDE.md') -Raw -Encoding UTF8
$beg = '<!-- BEGIN EGO-OS KERNEL (managed by install.ps1) -->'
$end = '<!-- END EGO-OS KERNEL -->'
$block = "$beg`n$kernel`n$end"
Backup-One $ccMd
$cur = if (Test-Path $ccMd) { Get-Content $ccMd -Raw -Encoding UTF8 } else { '' }
if ($cur -match [regex]::Escape($beg)) {
  $pattern = "(?s)" + [regex]::Escape($beg) + ".*?" + [regex]::Escape($end)
  $ev = [System.Text.RegularExpressions.MatchEvaluator]{ param($x) $block }
  $new = [regex]::Replace($cur, $pattern, $ev)
  Say "  ~ bloque kernel actualizado"
} else {
  $new = if ($cur.Trim()) { "$cur`n`n$block" } else { $block }
  Say "  + bloque kernel anadido"
}
if (-not $DryRun) { Set-Content -Path $ccMd -Value $new -Encoding UTF8 }

Head "Hooks en settings.json (net-new: PostToolUse security y debug, Stop)"
$settingsPath = Join-Path $CC 'settings.json'
$settings = if (Test-Path $settingsPath) { Get-Content $settingsPath -Raw | ConvertFrom-Json } else { [PSCustomObject]@{} }
if (-not $settings.PSObject.Properties['hooks']) { $settings | Add-Member -NotePropertyName hooks -NotePropertyValue ([PSCustomObject]@{}) }
function Add-Hook([string]$event, [string]$script, [string]$matcher) {
  $cmd = "node `"$CC\hooks\$script`""
  $arr = @()
  if ($settings.hooks.PSObject.Properties[$event]) { $arr = @($settings.hooks.$event) }
  foreach ($grp in $arr) { foreach ($h in @($grp.hooks)) { if ($h.command -eq $cmd) { Say "  = $event/$script (ya presente)"; return } } }
  $entry = [PSCustomObject]@{ hooks = @([PSCustomObject]@{ type = 'command'; command = $cmd }) }
  if ($matcher) { $entry | Add-Member -NotePropertyName matcher -NotePropertyValue $matcher }
  $arr += $entry
  if ($settings.hooks.PSObject.Properties[$event]) { $settings.hooks.$event = $arr } else { $settings.hooks | Add-Member -NotePropertyName $event -NotePropertyValue $arr }
  Say "  + $event -> $script" 'Green'
}
Add-Hook 'PostToolUse' 'post-tool-use.mjs' ''
Add-Hook 'Stop'        'stop.mjs'          ''
if ($AllHooks) {
  Add-Hook 'SessionStart'      'session-start.mjs'      'startup|resume|clear|compact'
  Add-Hook 'UserPromptSubmit'  'user-prompt-submit.mjs' ''
}
if (-not $DryRun) { $settings | ConvertTo-Json -Depth 20 | Set-Content -Path $settingsPath -Encoding UTF8 }

Head "MCP servers (check-first: ego-* ya registrados user-scope -> se omiten)"
if ($NoMcp -or -not $cla) {
  Say "  omitido (opcion -NoMcp o claude CLI ausente)."
} else {
  $mcpList = ''
  try { $mcpList = (& claude mcp list 2>&1 | Out-String) } catch { $mcpList = '' }
  foreach ($n in @('ego-memory','ego-simbionte','ego-toolbelt')) {
    if ($mcpList -match [regex]::Escape($n)) { Say "  = $n (ya registrado)" } else { Say "  ! $n no registrado; lo provee el plugin ego (ver E:\skill\ego\scripts\install.ps1)" 'DarkYellow' }
  }
  if ($mcpList -match 'codebase-memory') {
    Say "  = codebase-memory (ya registrado)"
  } elseif (-not $DryRun) {
    $launcher = Join-Path $CC 'mcp-launchers\codebase-memory.mjs'
    try { & claude mcp add -s user codebase-memory -- node "$launcher" 2>&1 | Out-Null; Say "  + codebase-memory (user-scope, launcher perezoso)" 'Green' }
    catch { Say "  ! no se pudo registrar codebase-memory: $_" 'DarkYellow' }
  }
}

Head "Claude Desktop (merge no destructivo de MCP)"
$desktopCfg = Join-Path $env:APPDATA 'Claude\claude_desktop_config.json'
if ($NoDesktop) { Say "  omitido (-NoDesktop)." }
elseif (-not (Test-Path $desktopCfg)) { Say "  Claude Desktop no detectado (sin config)." }
else {
  if (-not $DryRun) { Copy-Item $desktopCfg "$desktopCfg.ego-bak-$ts" -Force; Say "  backup: $desktopCfg.ego-bak-$ts" }
  $d = Get-Content $desktopCfg -Raw | ConvertFrom-Json
  if (-not $d.PSObject.Properties['mcpServers']) { $d | Add-Member -NotePropertyName mcpServers -NotePropertyValue ([PSCustomObject]@{}) }
  $added = 0
  if (Test-Path $egoVenv) {
    foreach ($m in @(@{n='ego-memory';mod='ego_memory'}, @{n='ego-simbionte';mod='ego_simbionte'})) {
      if (-not $d.mcpServers.PSObject.Properties[$m.n]) {
        $srv = [PSCustomObject]@{ command = $egoVenv; args = @('-m', $m.mod); env = [PSCustomObject]@{ PYTHONPATH = 'E:\skill\ego\mcp' } }
        $d.mcpServers | Add-Member -NotePropertyName $m.n -NotePropertyValue $srv
        $added++; Say "  + Desktop MCP: $($m.n)" 'Green'
      } else { Say "  = Desktop MCP: $($m.n) (ya presente)" }
    }
  } else { Say "  ego venv ausente -> no se anaden MCP a Desktop." 'DarkYellow' }
  if (-not $DryRun -and $added -gt 0) { $d | ConvertTo-Json -Depth 20 | Set-Content -Path $desktopCfg -Encoding UTF8 }
}

Head "Export web (dist/web para Project instructions de claude.ai)"
$web = Join-Path $Repo 'dist\web'
if (-not $DryRun) { New-Item -ItemType Directory -Force -Path $web | Out-Null }
$bundle = "# EGO OS - Project instructions (proyeccion web)`n`n"
$bundle += (Get-Content (Join-Path $Repo 'CLAUDE.md') -Raw -Encoding UTF8) + "`n`n---`n`n"
Get-ChildItem (Join-Path $Repo '.claude\rules') -Filter *.md | Sort-Object Name | ForEach-Object {
  $bundle += "## rule: $($_.Name)`n`n" + (Get-Content $_.FullName -Raw -Encoding UTF8) + "`n`n"
}
if (-not $DryRun) { Set-Content -Path (Join-Path $web 'PROJECT-INSTRUCTIONS.md') -Value $bundle -Encoding UTF8 }
Say "  + dist/web/PROJECT-INSTRUCTIONS.md (kernel + rules)" 'Green'

Head "pxpipe (opt-in, OFF por defecto)"
$stateDir = Join-Path $CC 'state'
$stFile = Join-Path $stateDir 'settings.json'
if ($EnablePxpipe) {
  if (-not $DryRun) {
    New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
    $st = if (Test-Path $stFile) { Get-Content $stFile -Raw | ConvertFrom-Json } else { [PSCustomObject]@{} }
    if ($st.PSObject.Properties['pxpipe']) { $st.pxpipe = '1' } else { $st | Add-Member -NotePropertyName pxpipe -NotePropertyValue '1' }
    $st | ConvertTo-Json -Depth 10 | Set-Content -Path $stFile -Encoding UTF8
  }
  Say "  pxpipe opt-in ACTIVADO (nunca en Opus). Ver docs/PXPIPE.md." 'Green'
} else { Say "  pxpipe OFF (default). Activalo con -EnablePxpipe. Ver docs/PXPIPE.md." }

Head "Manifest (para uninstall.ps1)"
# Idempotencia: en re-instalaciones $installed puede venir vacio (todo identico). Preservamos el backup
# ORIGINAL (pristine, previo a EGO OS) y hacemos union de ficheros para no perder el registro.
$existingMan = if (Test-Path $Manifest) { try { Get-Content $Manifest -Raw | ConvertFrom-Json } catch { $null } } else { $null }
$origBackup  = if ($existingMan -and $existingMan.backup) { $existingMan.backup } else { $Backup }
$existingFiles = if ($existingMan -and $existingMan.installed) { @($existingMan.installed) } else { @() }
$allInstalled = @($existingFiles + $installed.ToArray()) | Where-Object { $_ } | Select-Object -Unique
$man = [PSCustomObject]@{ version = '1'; ts = $ts; backup = $origBackup; installed = $allInstalled }
if (-not $DryRun) { $man | ConvertTo-Json -Depth 10 | Set-Content -Path $Manifest -Encoding UTF8 }
Say "  manifest: $Manifest ($($allInstalled.Count) ficheros; backup original: $origBackup)"

Head "Smoke test"
$smokeOk = $true
if ($DryRun) { Say "  [DryRun] omitido (los hooks aun no estan copiados)." 'Magenta' }
else {
  # PowerShell 5.1 no entrega bien stdin con '$s | & node'; usamos un fichero temporal + redireccion de cmd.
  $eap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  function Invoke-Hook([string]$script, [string]$json) {
    $tmp = Join-Path $env:TEMP ("ego-smoke-" + [guid]::NewGuid().ToString('N') + '.json')
    Set-Content -Path $tmp -Value $json -Encoding ASCII -NoNewline
    $hook = Join-Path $CC "hooks\$script"
    $out = cmd /c "node `"$hook`" < `"$tmp`" 2>NUL"
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    return ($out | Out-String)
  }
  try {
    $r1 = Invoke-Hook 'session-start.mjs' '{"model":"claude-fable-5"}'
    if ($r1 -match 'EGO OS activo') { Say "  session-start: OK" 'Green' } else { Say "  session-start: salida inesperada" 'Red'; $smokeOk = $false }
    $ccFwd = ($CC -replace '\\','/')
    $r2 = Invoke-Hook 'post-tool-use.mjs' ('{"tool_name":"Bash","tool_input":{"command":"nmap example.com"},"cwd":"' + $ccFwd + '"}')
    if ($r2 -match 'block') { Say "  security gate (externo->block): OK" 'Green' } else { Say "  security gate: NO bloqueo (revisar)" 'Red'; $smokeOk = $false }
    $r3 = Invoke-Hook 'post-tool-use.mjs' '{"tool_name":"Bash","tool_input":{"command":"nmap 127.0.0.1"}}'
    if ($r3.Trim() -eq '{}') { Say "  security gate (local->permite): OK" 'Green' } else { Say "  security gate local: salida inesperada" 'DarkYellow' }
    $ensureOut = cmd /c "node `"$(Join-Path $CC 'ensure.mjs')`" ego 2>NUL"
    if ($LASTEXITCODE -eq 0) { Say "  ensure ego (check-first no-op): OK" 'Green' } else { Say "  ensure ego: exit $LASTEXITCODE" 'DarkYellow' }
  } catch { Say "  smoke test error: $_" 'Red'; $smokeOk = $false }
  finally { $ErrorActionPreference = $eap }
}

Write-Host ""
if ($smokeOk) { Say "EGO OS instalado (aditivo, reversible con uninstall.ps1). Backup: $Backup" 'Cyan' }
else { Say "EGO OS instalado con avisos en el smoke test - revisalos arriba." 'Yellow' }
Say "Reinicia Claude Code para cargar hooks/skills/commands nuevos."
