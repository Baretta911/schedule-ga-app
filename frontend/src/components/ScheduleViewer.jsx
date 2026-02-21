import React from 'react';

const ALLELE_LABELS = {
  0: 'REST',
  1: 'WORK',
  2: 'STUDY',
  3: 'NAP'
};

function summarizeByDay(chromosome) {
  if (!chromosome) return [];
  const NUM_DAYS = 7;
  const SLOTS_PER_DAY = 48;
  const result = [];

  for (let day = 0; day < NUM_DAYS; day++) {
    const start = day * SLOTS_PER_DAY;
    const end = start + SLOTS_PER_DAY;
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };

    for (let i = start; i < end && i < chromosome.length; i++) {
      const gene = chromosome[i];
      if (counts[gene] !== undefined) counts[gene] += 1;
    }

    result.push({
      day: day + 1,
      counts
    });
  }

  return result;
}

function ScheduleViewer({ bestIndividual, stats }) {
  if (!bestIndividual) {
    return null;
  }

  const byDay = summarizeByDay(bestIndividual.chromosome);

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <h2>Hasil Terbaik</h2>
      <p>
        Fitness terbaik: <strong>{bestIndividual.fitness.toFixed(2)}</strong>
      </p>
      {stats?.bestFitnessPerGeneration && (
        <p>
          Generasi terakhir: {stats.bestFitnessPerGeneration.length} | Fitness awal:{' '}
          {stats.bestFitnessPerGeneration[0].toFixed(2)} → Fitness akhir:{' '}
          {stats.bestFitnessPerGeneration[stats.bestFitnessPerGeneration.length - 1].toFixed(2)}
        </p>
      )}

      <h3>Ringkasan Jadwal per Hari (jumlah slot)</h3>
      <table border="1" cellPadding="4" style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 600 }}>
        <thead>
          <tr>
            <th>Hari</th>
            <th>REST</th>
            <th>WORK</th>
            <th>STUDY</th>
            <th>NAP</th>
          </tr>
        </thead>
        <tbody>
          {byDay.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{d.counts[0]}</td>
              <td>{d.counts[1]}</td>
              <td>{d.counts[2]}</td>
              <td>{d.counts[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#555' }}>
        Catatan: 1 slot = 30 menit. 48 slot per hari = 24 jam.
      </p>
    </div>
  );
}

export default ScheduleViewer;
