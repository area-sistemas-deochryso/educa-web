# F6a — Wrapper para correr scripts k6 con secrets pedidos en terminal.
#
# Uso:
#   .\run.ps1 01-pico-matutino.js
#   .\run.ps1 04-saturacion-combinada.js -ExtraArgs '--out json=results\f6a-04.json'
#
# Lee el resto de variables desde .env-f6a (gitignored). El CROSSCHEX_WEBHOOK_SECRET
# NUNCA se persiste en disco — siempre se pide acá con Read-Host -AsSecureString
# y se pasa a k6 vía -e flag (variable de entorno del proceso hijo, no del shell).
#
# Scripts que NO necesitan secret (02, 03, 05, 06): podés correrlos directo con `k6 run ...`
# sin este wrapper, o pasarlos por acá igual y se omite el prompt.

[CmdletBinding()]
param(
	[Parameter(Mandatory = $true, Position = 0)]
	[string]$Script,

	[string]$EnvFile = (Join-Path $PSScriptRoot '.env-f6a'),

	[string]$ExtraArgs = ''
)

$ErrorActionPreference = 'Stop'

# 1. Resolver el path del script k6 ----------------------------------------
$scriptPath = if (Test-Path $Script) { (Resolve-Path $Script).Path }
              else { Join-Path $PSScriptRoot $Script }

if (-not (Test-Path $scriptPath)) {
	throw "No se encontró el script: $Script"
}

$scriptName = Split-Path $scriptPath -Leaf

# 2. Cargar .env-f6a (sin el secret) ---------------------------------------
if (-not (Test-Path $EnvFile)) {
	throw "Falta archivo de credenciales: $EnvFile (copialo desde .env-f6a.example)"
}

$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
	$line = $_.Trim()
	if ($line -and -not $line.StartsWith('#')) {
		$idx = $line.IndexOf('=')
		if ($idx -gt 0) {
			$key = $line.Substring(0, $idx).Trim()
			$val = $line.Substring($idx + 1).Trim()
			# Ignorar el secret aunque alguien lo haya puesto en el .env por error
			if ($key -ne 'CROSSCHEX_WEBHOOK_SECRET') {
				$envVars[$key] = $val
			}
		}
	}
}

# 3. Pedir el secret SOLO si el script lo necesita -------------------------
$needsSecret = $scriptName -match '^(01|04)-'

if ($needsSecret) {
	Write-Host ""
	Write-Host "Este escenario llama el webhook CrossChex y necesita el secret." -ForegroundColor Yellow
	Write-Host "El valor NO queda en disco ni en historial de shell." -ForegroundColor DarkGray
	$secureSecret = Read-Host -Prompt 'CROSSCHEX_WEBHOOK_SECRET' -AsSecureString

	# Convertir SecureString a plain solo para pasarlo a k6 (no se loggea ni persiste).
	$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
	try {
		$secretPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
	} finally {
		[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
	}

	if ([string]::IsNullOrWhiteSpace($secretPlain)) {
		throw 'CROSSCHEX_WEBHOOK_SECRET vacío. Abortando.'
	}

	$envVars['CROSSCHEX_WEBHOOK_SECRET'] = $secretPlain
}

# 4. Ensamblar argumentos -e para k6 ---------------------------------------
$k6Args = @('run', '--insecure-skip-tls-verify')

foreach ($k in $envVars.Keys) {
	$k6Args += '-e'
	$k6Args += "$k=$($envVars[$k])"
}

if ($ExtraArgs) {
	# permitir extras tipo --out json=...
	$k6Args += $ExtraArgs.Split(' ')
}

$k6Args += $scriptPath

# 5. Ejecutar --------------------------------------------------------------
Write-Host ""
Write-Host "▶  k6 run $scriptName" -ForegroundColor Cyan
Write-Host ""

& k6 @k6Args
$exit = $LASTEXITCODE

# 6. Borrar el secret de memoria del proceso PS (best-effort) --------------
if ($needsSecret) {
	$envVars['CROSSCHEX_WEBHOOK_SECRET'] = $null
	$secretPlain = $null
	[System.GC]::Collect()
}

exit $exit
