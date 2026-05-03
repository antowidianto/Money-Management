# KasKu

Aplikasi mobile Expo React Native untuk manajemen keuangan pribadi: pemasukan, pengeluaran, tabungan, dashboard monitoring, serta laporan bulanan dan tahunan.

## Stack

- Expo SDK 54
- React Native 0.81
- TypeScript
- AsyncStorage untuk penyimpanan lokal
- Lucide React Native untuk ikon

## Android

Target instalasi dibatasi ke Android 14 ke atas melalui `minSdkVersion: 34` di `app.json`.

## Menjalankan

```bash
npm install
npm start
```

Server Expo lokal saat ini bisa dibuka dari:

```text
http://localhost:8081
```

Untuk Android fisik, buka Expo Go pada jaringan yang sama lalu gunakan URL LAN yang muncul dari `npm start`.

## Build

Profil build awal tersedia di `eas.json`.

```bash
npm run build:android:apk
```

Output APK lokal:

```text
dist/KasKu-android14-preview.apk
```

Build cloud tetap bisa digunakan dengan EAS:

```bash
npx eas-cli build -p android --profile preview
npx eas-cli build -p android --profile production
```

`preview` menghasilkan APK internal. `production` menghasilkan Android App Bundle untuk rilis.
