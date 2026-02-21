# Schedule GA Backend

## Menjalankan

```bash
cd backend
npm install
npm run dev   # atau: npm start
```

Backend akan berjalan di port default `4000` dan menyediakan endpoint:

- `POST /api/ga/run` – menjalankan Genetic Algorithm dengan konfigurasi yang dikirim via JSON body.

## Alur Singkat

1. Frontend mengirim konfigurasi GA (maxGenerations, populationSize, dst.) dan daftar `fixedStudyIndices`.
2. Backend memanggil `runGeneticAlgorithm` di `services/gaScheduler.js`.
3. Modul TPM (`tpmModel.js`) menghitung Process S dan Process C.
4. GA mengoptimasi kromosom jadwal 7 hari untuk meminimalkan total fatigue + penalti.
5. Backend mengembalikan individu terbaik dan statistik fitness per generasi.
