$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$tooling = Join-Path $root ".tooling"
$downloads = Join-Path $tooling "downloads"
$javaHome = Join-Path $tooling "jdk17"
$androidHome = Join-Path $tooling "android-sdk"
$cmdlineLatest = Join-Path $androidHome "cmdline-tools\latest"
$jdkZip = Join-Path $downloads "temurin-jdk17.zip"
$cmdlineZip = Join-Path $downloads "android-commandlinetools.zip"

$jdkUrl = "https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse?project=jdk"
$cmdlineToolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-14742923_latest.zip"

function Download-FileIfMissing {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  if (Test-Path $Destination) {
    return
  }

  Write-Host "Downloading $Url"
  curl.exe -L $Url -o $Destination
}

function Copy-DirectoryWithRobocopy {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  robocopy $Source $Destination /E /NFL /NDL /NJH /NJS /NC /NS | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "robocopy failed with exit code $LASTEXITCODE"
  }
}

New-Item -ItemType Directory -Force -Path $tooling, $downloads, $androidHome | Out-Null

Download-FileIfMissing -Url $jdkUrl -Destination $jdkZip
Download-FileIfMissing -Url $cmdlineToolsUrl -Destination $cmdlineZip

if (-not (Test-Path (Join-Path $javaHome "bin\java.exe"))) {
  Write-Host "Extracting portable JDK 17"
  $jdkExtract = Join-Path $tooling "jdk17-extract"
  if (Test-Path $jdkExtract) {
    Remove-Item -LiteralPath $jdkExtract -Recurse -Force
  }

  New-Item -ItemType Directory -Force -Path $jdkExtract | Out-Null
  Expand-Archive -LiteralPath $jdkZip -DestinationPath $jdkExtract -Force
  $innerJdk = Get-ChildItem -LiteralPath $jdkExtract -Directory | Select-Object -First 1
  Copy-DirectoryWithRobocopy -Source $innerJdk.FullName -Destination $javaHome
  Remove-Item -LiteralPath $jdkExtract -Recurse -Force
}

if (-not (Test-Path (Join-Path $cmdlineLatest "bin\sdkmanager.bat"))) {
  Write-Host "Extracting Android command line tools"
  $cmdlineParent = Join-Path $androidHome "cmdline-tools"
  $cmdlineExtract = Join-Path $tooling "cmdline-tools-extract"

  if (Test-Path $cmdlineExtract) {
    Remove-Item -LiteralPath $cmdlineExtract -Recurse -Force
  }

  New-Item -ItemType Directory -Force -Path $cmdlineParent, $cmdlineExtract | Out-Null
  Expand-Archive -LiteralPath $cmdlineZip -DestinationPath $cmdlineExtract -Force
  Copy-DirectoryWithRobocopy -Source (Join-Path $cmdlineExtract "cmdline-tools") -Destination $cmdlineLatest
  Remove-Item -LiteralPath $cmdlineExtract -Recurse -Force
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidHome
$env:ANDROID_SDK_ROOT = $androidHome
$env:PATH = "$javaHome\bin;$androidHome\cmdline-tools\latest\bin;$androidHome\platform-tools;$env:PATH"

$sdkmanager = Join-Path $cmdlineLatest "bin\sdkmanager.bat"
$sdkPackages = @(
  "platform-tools",
  "platforms;android-36",
  "build-tools;36.0.0",
  "build-tools;35.0.0",
  "ndk;27.1.12297006",
  "cmake;3.22.1"
)

Write-Host "Accepting Android SDK licenses"
1..80 | ForEach-Object { "y" } | & $sdkmanager --sdk_root=$androidHome --licenses

Write-Host "Installing Android SDK packages"
& $sdkmanager --sdk_root=$androidHome @sdkPackages

Write-Host "Android tooling is ready:"
Write-Host "JAVA_HOME=$javaHome"
Write-Host "ANDROID_HOME=$androidHome"
