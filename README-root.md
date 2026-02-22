# Schedule GA App

Project ini berisi aplikasi fullstack untuk optimasi jadwal 7 hari menggunakan Genetic Algorithm (GA) dan Two-Process Model (TPM).

## Struktur

- `backend/` – Node.js + Express, implementasi GA dan TPM.
- `frontend/` – React + Vite, UI untuk mengatur parameter dan melihat hasil jadwal.

## Cara Menjalankan

### Backend

```bash
cd backend
npm install
npm run dev   # atau: npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Lalu buka URL yang ditampilkan Vite (biasanya `http://localhost:5173`). Pastikan backend berjalan di `http://localhost:4000`.

## Ringkasan Kontrak API

Endpoint utama backend: `POST /api/ga/run`.

Endpoint metadata backend: `GET /api/ga/meta`.

- Parameter numerik dinormalisasi secara lenient (coerce + fallback default).
- Backend menerima `gaConfigOverrides` untuk override runtime config yang didukung.
- Konflik slot tetap mengikuti aturan **Study menang** saat `fixedStudyIndices` overlap dengan `fixedWorkIndices`.
- `stats.bestFitnessPerGeneration` dapat berupa array kosong; frontend menangani explicit empty-state.

## Changelog Singkat

- Backend menambahkan endpoint metadata `GET /api/ga/meta` untuk sinkronisasi topology schedule dan default GA.
- Route `POST /api/ga/run` sekarang melakukan normalisasi input lenient (coerce, clamp, sanitize index array).
- Scheduler sekarang mendukung `gaConfigOverrides` dengan whitelist key runtime.
- Policy overlap STUDY/WORK diseragamkan menjadi **Study menang** di backend dan UI.
- Frontend menampilkan metadata runtime aktif (backend/fallback) agar konteks run terlihat jelas.
- Viewer menangani kondisi `stats.bestFitnessPerGeneration` kosong tanpa error.

## QA Manual Checklist

1. Jalankan backend dan frontend
	- Backend: `cd backend`, `npm install`, `npm run dev`
	- Frontend: `cd frontend`, `npm install`, `npm run dev`
2. Verifikasi endpoint metadata
	- Akses `GET /api/ga/meta`
	- Pastikan response memiliki `schedule.numDays`, `schedule.slotsPerDay`, `schedule.totalSlots`, dan `defaults`.
3. Verifikasi normalisasi input lenient (`POST /api/ga/run`)
	- Kirim nilai tidak ideal (mis. string number, rate di luar `0..1`, index invalid).
	- Pastikan backend tetap merespons sukses (tidak crash) dan menghasilkan output GA valid.
4. Verifikasi policy overlap Study menang
	- Di UI, buat blok STUDY dan WORK yang overlap.
	- Pastikan UI menampilkan info overlap.
	- Pastikan run tetap sukses dan overlap diprioritaskan sebagai STUDY.
5. Verifikasi metadata runtime di UI
	- Pastikan ringkasan konfigurasi aktif tampil di halaman utama.
	- Pastikan di area hasil (`ScheduleViewer`) konteks run dan badge sumber metadata tampil.
6. Verifikasi empty-state statistik generasi
	- Pastikan UI tidak error saat `stats.bestFitnessPerGeneration` kosong.
	- Pastikan pesan empty-state statistik tampil dengan benar.
7. Verifikasi regressions dasar
	- Run GA normal tanpa blok fixed.
	- Run GA dengan blok STUDY saja.
	- Run GA dengan blok WORK saja.
	- Pastikan tabel ringkasan per hari tetap muncul dan tidak ada error runtime di console.
