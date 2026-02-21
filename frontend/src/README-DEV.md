# Schedule GA Frontend

## Menjalankan

```bash
cd frontend
npm install
npm run dev
```

Secara default, frontend akan berjalan di port `5173`. Pastikan backend berjalan di `http://localhost:4000` atau set environment variable Vite:

```bash
VITE_BACKEND_URL=http://localhost:4000 npm run dev
```

## Alur Singkat

1. Komponen `GaConfigForm` mengumpulkan parameter GA dan daftar indeks studi tetap.
2. `App` memanggil `runGa` dari `services/apiClient.js` untuk mengirim konfigurasi ke backend.
3. Backend menjalankan GA dan mengembalikan `bestIndividual` dan `stats`.
4. `ScheduleViewer` menampilkan fitness terbaik dan ringkasan jadwal per hari.
