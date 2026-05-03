# KasKu

KasKu adalah aplikasi mobile untuk manajemen keuangan pribadi. Aplikasi ini membantu mencatat pemasukan, pengeluaran, tabungan, melihat kondisi cashflow di dashboard, dan membaca laporan bulanan atau tahunan.

## Fitur

- Dashboard kondisi keuangan per bulan atau per tahun
- Pencatatan transaksi pemasukan, pengeluaran, dan tabungan
- Kategori transaksi siap pakai
- Pencarian dan filter transaksi
- Laporan kategori dan tren cashflow
- Penyimpanan lokal di perangkat dengan AsyncStorage
- APK lokal yang bisa diinstall di Android 14 ke atas

## Stack

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript
- AsyncStorage
- Lucide React Native
- Android Gradle build native yang dihasilkan dari Expo prebuild

## Kebutuhan

Minimal untuk development:

- Node.js
- npm
- PowerShell
- Android device Android 14+ atau emulator Android

Untuk build APK lokal, proyek ini memakai toolchain portabel di folder `.tooling/`. Script setup akan mengunduh:

- Temurin JDK 17
- Android command line tools
- Android SDK Platform 36
- Android Build Tools 36.0.0 dan 35.0.0
- Android NDK 27.1.12297006
- CMake 3.22.1

Folder `.tooling/`, `android/`, dan `dist/` di-ignore dari git karena berisi generated files dan artifact besar.

## Setup Fresh Clone

```powershell
git clone <repo-url>
cd "Money Management"
npm install
```

Validasi TypeScript:

```powershell
npm run typecheck
```

## Menjalankan App

Jalankan Expo:

```powershell
npm start
```

Untuk Android fisik:

1. Install Expo Go dari Play Store.
2. Pastikan HP dan laptop berada di jaringan yang sama.
3. Scan QR dari terminal Expo.

Untuk emulator Android:

```powershell
npm run android
```

Untuk preview web di browser:

```powershell
npm run web
```

Catatan: `http://localhost:8081` pada mode native Expo biasanya menampilkan manifest atau bundle info. Untuk melihat UI di browser, gunakan `npm run web`.

## Debugging

Shortcut saat `npm start` berjalan:

```text
r  reload app
m  buka dev menu
j  buka JavaScript debugger
a  buka Android emulator
w  buka web
?  lihat semua shortcut
```

Tips debugging:

- Pakai `console.log(...)`; output muncul di terminal Expo.
- Error JavaScript biasanya muncul sebagai red screen di app.
- Untuk debug web, buka DevTools browser dengan `F12`.
- Jalankan `npm run typecheck` sebelum build APK.

## Build APK Installable

Untuk build APK lokal dari fresh clone:

```powershell
npm run build:android:apk
```

Command tersebut akan:

1. Memasang dependency npm jika `node_modules/` belum ada.
2. Menyiapkan JDK dan Android SDK portabel di `.tooling/` jika belum ada.
3. Menjalankan `expo prebuild` untuk menghasilkan folder `android/` jika belum ada.
4. Menjalankan Gradle task `:app:assembleRelease`.
5. Menyalin APK ke folder `dist/`.

Output APK:

```text
dist/KasKu-android14-preview.apk
```

Metadata APK saat terakhir diverifikasi:

```text
Package       : com.codex.kasku
App label     : KasKu
Version       : 1.0.0
Version code  : 1
Min SDK       : 34
Target SDK    : 36
File          : dist/KasKu-android14-preview.apk
```

APK ini adalah build preview/release lokal yang ditandatangani dengan debug certificate dari template Android. Ini cocok untuk testing dan install manual. Untuk Play Store, gunakan signing key produksi dan build AAB.

## Install APK ke Android

Manual:

1. Pindahkan `dist/KasKu-android14-preview.apk` ke HP Android 14+.
2. Buka file APK.
3. Izinkan `Install unknown apps` jika Android meminta izin.
4. Install aplikasi.

Dengan ADB:

```powershell
.\.tooling\android-sdk\platform-tools\adb.exe devices
.\.tooling\android-sdk\platform-tools\adb.exe install -r "dist\KasKu-android14-preview.apk"
```

Jika device tidak muncul, aktifkan Developer Options dan USB debugging di Android.

## Build Cloud dengan EAS

Profil EAS tersedia di `eas.json`.

APK internal:

```powershell
npx eas-cli build -p android --profile preview
```

Android App Bundle untuk rilis:

```powershell
npx eas-cli build -p android --profile production
```

## Struktur Proyek

```text
App.tsx                         UI utama aplikasi
src/constants.ts                Label, kategori, dan storage key
src/finance.ts                  Perhitungan summary, periode, format uang, dan laporan
src/storage.ts                  Load/save transaksi dari AsyncStorage
src/theme.ts                    Warna dan shadow
src/types.ts                    Tipe data aplikasi
scripts/setup-android-tooling.ps1
scripts/build-android-apk.ps1
app.json                        Konfigurasi Expo dan Android minSdkVersion 34
eas.json                        Profil build EAS
dist/                           Output APK lokal, tidak di-commit
android/                        Generated native project, tidak di-commit
.tooling/                       JDK dan Android SDK portabel, tidak di-commit
```

## Catatan Git

File APK tidak disarankan di-commit ke repository karena ukuran besar dan sifatnya artifact build. Untuk membagikan APK, gunakan GitHub Releases lalu upload `dist/KasKu-android14-preview.apk` sebagai release asset.

File yang perlu di-commit:

```text
App.tsx
src/
scripts/
app.json
eas.json
package.json
package-lock.json
README.md
.gitignore
```

File/folder yang tidak perlu di-commit:

```text
node_modules/
.tooling/
android/
dist/
.expo/
```

## Troubleshooting

Jika `localhost:8081` menampilkan JSON, itu normal untuk Expo native. Jalankan `npm run web` untuk preview browser.

Jika build gagal karena Android SDK atau JDK belum ada:

```powershell
npm run setup:android
npm run build:android:apk
```

Jika port Expo sudah dipakai:

```powershell
Get-NetTCPConnection -LocalPort 8081 | Select-Object LocalPort,OwningProcess
Stop-Process -Id <OwningProcess>
```

Jika ingin build benar-benar bersih:

```powershell
Remove-Item -Recurse -Force android, dist
npm run build:android:apk
```
