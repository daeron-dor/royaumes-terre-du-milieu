param(
    [string]$Database = 'data/campaign-copy.sqlite',
    [string]$Origin = 'http://localhost:3102'
)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path $PSScriptRoot -Parent)
# Prefer an installed JDK; the migration workspace also has a local JDK.
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    $bundledJdk = Join-Path (Get-Location) '../../.tooling/java/jdk-21.0.12.1+1/bin'
    if (Test-Path -LiteralPath (Join-Path $bundledJdk 'java.exe')) {
        $env:PATH = "$bundledJdk;$env:PATH"
    } else { throw 'Installer Java 21 et ajouter son dossier bin au PATH.' }
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Installer Node.js 22.13 ou supérieur.' }
node scripts/start-host.mjs $Database $Origin
exit $LASTEXITCODE
