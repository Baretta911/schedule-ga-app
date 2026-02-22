# Schedule GA App - Ringkasan

## Gambaran Umum
Aplikasi full-stack yang membuat jadwal mingguan menggunakan Genetic Algorithm (GA) yang dikombinasikan dengan Two-Process Model (TPM) untuk kelelahan. Tujuannya adalah menyeimbangkan kerja, kuliah, tidur, power nap, dan waktu luang dalam 7 hari.

## Tujuan Utama
- Membuat jadwal mingguan yang realistis dan seimbang.
- Menghormati blok kuliah dan kerja yang bersifat tetap.
- Meminimalkan kelelahan sambil memenuhi kebutuhan tidur minimum.
- Menampilkan hasil jadwal secara jelas dan visual.

## Arsitektur
- Backend: Node.js + Express
- Frontend: React + Vite
- Mesin GA: implementasi kustom (seleksi, crossover, mutasi, elitisme)
- Model Kelelahan: Two-Process Model (Process S dan Process C)

## Konsep Kunci
### Representasi Waktu
- 7 hari, 48 slot per hari
- 1 slot = 30 menit
- Total: 336 slot per minggu

### Allele (Pengkodean Aktivitas)
- 0 = LEISURE (Waktu Luang)
- 1 = WORK (Kerja)
- 2 = STUDY_FIXED (Kuliah wajib)
- 3 = NAP (Power Nap)
- 4 = SLEEP (Tidur)

### Target Optimasi
GA mengoptimalkan skor fitness berdasarkan:
- Tingkat kelelahan (Process S - Process C)
- Pelanggaran slot kuliah tetap (penalti besar)
- Kuota tidur minimum harian
- Aturan power nap (penalti sleep inertia untuk nap terlalu lama)

## Alur Backend
1. Client mengirim konfigurasi ke POST /api/ga/run
2. Backend menormalkan dan memvalidasi input
3. GA menginisialisasi populasi
4. GA berevolusi (seleksi, crossover, mutasi)
5. Fitness dihitung per kromosom
6. Kromosom terbaik dikembalikan beserta statistik

## Alur Frontend
1. Aplikasi memuat metadata jadwal dari GET /api/ga/meta
2. Pengguna memilih preset atau mengubah parameter
3. Pengguna menambahkan blok kuliah/kerja tetap
4. Pengguna menjalankan optimasi
5. Hasil ditampilkan:
   - Kartu ringkasan
   - Gantt chart mingguan
   - Detail per hari
   - Tabel ringkasan

## Pipeline GA
- Inisialisasi: aktivitas acak kecuali slot tetap
- Seleksi: tournament selection
- Crossover: two-point
- Mutasi: swap
- Elitisme: individu terbaik dipertahankan
- Early stopping: berhenti saat tidak ada perbaikan

## Aturan Tidur, Nap, dan Waktu Luang
- Minimum tidur harian: 10 slot (5 jam)
- Power nap efektif: 1-2 slot
- Power nap 3-4 slot: diberi penalti (sleep inertia)
- Power nap >4 slot: dianggap sebagai tidur
- Waktu luang mengurangi kelelahan ringan (0.3x efek tidur)

## File Penting
### Backend
- backend/src/server.js
- backend/src/routes/gaRoutes.js
- backend/src/services/gaScheduler.js
- backend/src/services/tpmModel.js
- backend/src/config/gaConfig.js

### Frontend
- frontend/src/App.jsx
- frontend/src/components/GaConfigForm.jsx
- frontend/src/components/ScheduleViewer.jsx
- frontend/src/services/apiClient.js
- frontend/src/config/scheduleConfig.js

## Endpoint API
- GET /api/ga/meta
  - Mengembalikan topologi jadwal dan konfigurasi default
- POST /api/ga/run
  - Menjalankan GA dan mengembalikan solusi terbaik

## Highlight UI
- Preset mode optimasi (Cepat, Seimbang, Teliti)
- Pembagian section yang jelas
- Gantt chart jadwal mingguan
- Detail blok waktu per hari
- Tabel ringkasan jam per aktivitas

## Asumsi
- Slot kuliah tetap selalu mengalahkan slot kerja.
- Tidur wajib setiap hari; waktu luang tidak bisa menggantikan tidur.
- Aturan power nap ditegakkan dengan penalti.

## Saran Dasar Ilmu
- Genetic Algorithm (GA): selection, crossover, mutation, elitism, dan tuning parameter.
- Optimisasi Terbatas: hard vs soft constraints, penalti, dan solusi feasible.
- Two-Process Model (TPM): Process S & C, sleep inertia, efektivitas nap.
- Sleep Physiology & Chronobiology: ritme sirkadian dan drive tidur homeostatik.
- Time-series Scheduling: representasi slot waktu, konflik jadwal, block scheduling.
- Multi-objective Optimization: trade-off kelelahan, tidur minimum, produktivitas.
- Human Factors / UX: penyajian jadwal agar mudah dipahami dan actionable.

## Daftar Bacaan dan Kata Kunci
- Genetic Algorithm: "genetic algorithm tournament selection", "two-point crossover", "mutation rate tuning", "elitism in GA".
- Constraint Optimization: "hard constraints vs soft constraints", "penalty function optimization", "constraint satisfaction scheduling".
- Two-Process Model: "Borbély two-process model", "Process S Process C sleep", "sleep inertia model".
- Power Nap: "power nap 10-30 minutes", "nap duration cognitive performance", "sleep inertia after nap".
- Chronobiology: "circadian rhythm phase", "homeostatic sleep drive", "chronotype effects".
- Scheduling: "time slot scheduling", "weekly timetable optimization", "block scheduling algorithm".
- Multi-objective: "Pareto optimization", "multi-objective genetic algorithm", "NSGA-II basics".
- UX untuk Jadwal: "calendar UX patterns", "information visualization for schedules", "Gantt chart best practices".

## Catatan
- Semua input waktu diselaraskan ke slot 30 menit.
- Performa dioptimalkan dengan evaluasi fitness satu lintasan.
- UI dibuat ramah pemula dan mudah dipahami.

