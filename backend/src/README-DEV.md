# Schedule GA Backend

## Menjalankan

```bash
cd backend
npm install
npm run dev   # atau: npm start
```

Backend akan berjalan di port default `4000` dan menyediakan endpoint:

- `GET /api/ga/meta` – metadata konfigurasi schedule dan default parameter GA.
- `POST /api/ga/run` – menjalankan Genetic Algorithm dengan konfigurasi yang dikirim via JSON body.

## Kontrak API (`POST /api/ga/run`)

### Request body

- `maxGenerations` (number, optional): akan di-coerce ke integer, default `200`, minimum `1`.
- `populationSize` (number, optional): akan di-coerce ke integer, default `100`, minimum `2`.
- `crossoverRate` (number, optional): akan di-coerce ke number, default `0.8`, di-clamp ke rentang `0..1`.
- `mutationRate` (number, optional): akan di-coerce ke number, default `0.2`, di-clamp ke rentang `0..1`.
- `earlyStopPatience` (number, optional): akan di-coerce ke integer, default `40`, minimum `0`.
- `fixedStudyIndices` (number[], optional): index slot akan disanitize (drop invalid/out-of-range), dedupe, sort.
- `fixedWorkIndices` (number[], optional): index slot akan disanitize (drop invalid/out-of-range), dedupe, sort.
- `gaConfigOverrides` (object, optional): override runtime config dengan whitelist key berikut:
	- `NUM_DAYS`, `SLOTS_PER_DAY`, `POP_SIZE`, `TOURNAMENT_SIZE`, `ELITE_COUNT`, `MAX_GENERATIONS`
	- `STUDY_PENALTY_PER_VIOLATION`, `SLEEP_PENALTY_PER_SLOT_SHORT`, `MIN_SLEEP_SLOTS_PER_DAY`
	- `CROSSOVER_RATE`, `MUTATION_RATE`, `TAU_R`, `TAU_D`, `DT_HOURS`, `S_MAX`, `S_INITIAL`, `C_AMPLITUDE`, `C_PHASE`

### Aturan konflik fixed slot

- Jika ada overlap antara `fixedStudyIndices` dan `fixedWorkIndices`, backend menerapkan **Study menang**.
- Artinya slot overlap akan tetap diperlakukan sebagai `STUDY_FIXED` di seluruh pipeline GA.

### Response

- Sukses:
	- `bestIndividual`: objek terbaik (`chromosome`, `fitness`) atau `null`.
	- `stats.bestFitnessPerGeneration`: array number, **boleh kosong**.
	- Catatan: jumlah generasi aktual bisa lebih kecil dari `maxGenerations` bila early stopping aktif.
- Gagal:
	- `{ error, details }`.

## Alur Singkat

1. Frontend mengirim konfigurasi GA (maxGenerations, populationSize, dst.) dan daftar `fixedStudyIndices`.
2. Backend memanggil `runGeneticAlgorithm` di `services/gaScheduler.js`.
3. Modul TPM (`tpmModel.js`) menghitung Process S dan Process C.
4. GA mengoptimasi kromosom jadwal 7 hari untuk meminimalkan total fatigue + penalti.
5. Backend mengembalikan individu terbaik dan statistik fitness per generasi.
