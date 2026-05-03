$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$javaHome = Join-Path $root ".tooling\jdk17"
$androidHome = Join-Path $root ".tooling\android-sdk"
$gradleProject = Join-Path $root "android"
$sourceApk = Join-Path $gradleProject "app\build\outputs\apk\release\app-release.apk"
$dist = Join-Path $root "dist"
$targetApk = Join-Path $dist "KasKu-android14-preview.apk"
$setupScript = Join-Path $root "scripts\setup-android-tooling.ps1"

if (-not (Test-Path (Join-Path $root "node_modules"))) {
  Write-Host "Installing npm dependencies"
  Push-Location $root
  try {
    npm install
  } finally {
    Pop-Location
  }
}
 
if (
  -not (Test-Path (Join-Path $javaHome "bin\java.exe")) -or
  -not (Test-Path (Join-Path $androidHome "platforms\android-36")) -or
  -not (Test-Path (Join-Path $androidHome "build-tools\36.0.0")) -or
  -not (Test-Path (Join-Path $androidHome "ndk\27.1.12297006"))
) { 
  Write-Host "Preparing portable Android build tooling"
  & powershell -ExecutionPolicy Bypass -File $setupScript
}

if (-not (Test-Path (Join-Path $gradleProject "gradlew.bat"))) {
  Push-Location $root
  try {
    npx expo prebuild --platform android --clean
  } finally {
    Pop-Location
  }
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidHome
$env:ANDROID_SDK_ROOT = $androidHome
$env:NODE_ENV = "production"
$env:PATH = "$javaHome\bin;$androidHome\cmdline-tools\latest\bin;$androidHome\platform-tools;$env:PATH"

Push-Location $gradleProject
try {
  .\gradlew.bat :app:assembleRelease --no-daemon
} finally {
  Pop-Location
}

New-Item -ItemType Directory -Force -Path $dist | Out-Null
Copy-Item -LiteralPath $sourceApk -Destination $targetApk -Force

$apk = Get-Item $targetApk
$hash = Get-FileHash $targetApk -Algorithm SHA256

Write-Host "APK created:"
Write-Host $apk.FullName
Write-Host "Size: $([Math]::Round($apk.Length / 1MB, 2)) MB"
Write-Host "SHA256: $($hash.Hash)"
