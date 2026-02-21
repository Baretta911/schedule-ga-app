import React, { useState } from 'react';

function GaConfigForm({ onRun, disabled }) {
  const [maxGenerations, setMaxGenerations] = useState(200);
  const [populationSize, setPopulationSize] = useState(100);
  const [crossoverRate, setCrossoverRate] = useState(0.8);
  const [mutationRate, setMutationRate] = useState(0.2);

  const [studyBlocks, setStudyBlocks] = useState([]);
  const [workBlocks, setWorkBlocks] = useState([]);

  const [newStudyDay, setNewStudyDay] = useState(1);
  const [newStudyStart, setNewStudyStart] = useState('08:00');
  const [newStudyEnd, setNewStudyEnd] = useState('10:00');

  const [newWorkDay, setNewWorkDay] = useState(1);
  const [newWorkStart, setNewWorkStart] = useState('09:00');
  const [newWorkEnd, setNewWorkEnd] = useState('17:00');

  const SLOTS_PER_DAY = 48;

  const timeToSlotInDay = (time) => {
    if (!time || typeof time !== 'string') return null;
    const parts = time.split(':');
    if (parts.length !== 2) return null;
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    if (minute !== 0 && minute !== 30) return null;
    if (hour < 0 || hour > 23) return null;
    const slotOffset = minute === 30 ? 1 : 0;
    return hour * 2 + slotOffset;
  };

  const blocksToIndices = (blocks) => {
    const indicesSet = new Set();
    blocks.forEach((block) => {
      const day = Number(block.day);
      const startSlot = timeToSlotInDay(block.start);
      const endSlot = timeToSlotInDay(block.end);
      if (!day || day < 1 || day > 7) return;
      if (startSlot == null || endSlot == null) return;
      if (endSlot <= startSlot) return;
      const dayBase = (day - 1) * SLOTS_PER_DAY;
      for (let s = startSlot; s < endSlot; s++) {
        const idx = dayBase + s;
        indicesSet.add(idx);
      }
    });
    return Array.from(indicesSet).sort((a, b) => a - b);
  };

  const addStudyBlock = () => {
    setStudyBlocks([
      ...studyBlocks,
      { day: Number(newStudyDay), start: newStudyStart, end: newStudyEnd }
    ]);
  };

  const removeStudyBlock = (index) => {
    setStudyBlocks(studyBlocks.filter((_, i) => i !== index));
  };

  const addWorkBlock = () => {
    setWorkBlocks([
      ...workBlocks,
      { day: Number(newWorkDay), start: newWorkStart, end: newWorkEnd }
    ]);
  };

  const removeWorkBlock = (index) => {
    setWorkBlocks(workBlocks.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const fixedStudyIndices = blocksToIndices(studyBlocks);
    const fixedWorkIndices = blocksToIndices(workBlocks);

    onRun({
      maxGenerations: Number(maxGenerations),
      populationSize: Number(populationSize),
      crossoverRate: Number(crossoverRate),
      mutationRate: Number(mutationRate),
      fixedStudyIndices,
      fixedWorkIndices
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem', border: '1px solid #ccc', padding: '1rem', borderRadius: 4 }}>
      <h2>Konfigurasi GA</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem' }}>
        <label>
          Max Generations
          <input
            type="number"
            value={maxGenerations}
            onChange={(e) => setMaxGenerations(e.target.value)}
            disabled={disabled}
            min={1}
            style={{ width: '100%' }}
          />
        </label>
        <label>
          Population Size
          <input
            type="number"
            value={populationSize}
            onChange={(e) => setPopulationSize(e.target.value)}
            disabled={disabled}
            min={2}
            style={{ width: '100%' }}
          />
        </label>
        <label>
          Crossover Rate
          <input
            type="number"
            step="0.01"
            value={crossoverRate}
            onChange={(e) => setCrossoverRate(e.target.value)}
            disabled={disabled}
            min={0}
            max={1}
            style={{ width: '100%' }}
          />
        </label>
        <label>
          Mutation Rate
          <input
            type="number"
            step="0.01"
            value={mutationRate}
            onChange={(e) => setMutationRate(e.target.value)}
            disabled={disabled}
            min={0}
            max={1}
            style={{ width: '100%' }}
          />
        </label>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <h3>Jadwal Kuliah (STUDY_FIXED)</h3>
        <p style={{ fontSize: '0.9rem', color: '#555' }}>
          Pilih hari dan rentang waktu (30 menit). Contoh: hari 1, 08:00 - 10:00.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            Hari (1-7)
            <input
              type="number"
              min={1}
              max={7}
              value={newStudyDay}
              onChange={(e) => setNewStudyDay(e.target.value)}
              disabled={disabled}
              style={{ width: '4rem' }}
            />
          </label>
          <label>
            Mulai
            <input
              type="time"
              value={newStudyStart}
              onChange={(e) => setNewStudyStart(e.target.value)}
              disabled={disabled}
            />
          </label>
          <label>
            Selesai
            <input
              type="time"
              value={newStudyEnd}
              onChange={(e) => setNewStudyEnd(e.target.value)}
              disabled={disabled}
            />
          </label>
          <button type="button" onClick={addStudyBlock} disabled={disabled}>
            Tambah Blok Kuliah
          </button>
        </div>
        {studyBlocks.length > 0 && (
          <ul style={{ marginTop: '0.5rem' }}>
            {studyBlocks.map((b, i) => (
              <li key={`${b.day}-${b.start}-${b.end}-${i}`}>
                Hari {b.day}: {b.start} - {b.end}{' '}
                <button type="button" onClick={() => removeStudyBlock(i)} disabled={disabled}>
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <h3>Jadwal Kerja (WORK)</h3>
        <p style={{ fontSize: '0.9rem', color: '#555' }}>
          Pilih hari dan rentang waktu kerja. Slot ini akan dikunci sebagai WORK.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            Hari (1-7)
            <input
              type="number"
              min={1}
              max={7}
              value={newWorkDay}
              onChange={(e) => setNewWorkDay(e.target.value)}
              disabled={disabled}
              style={{ width: '4rem' }}
            />
          </label>
          <label>
            Mulai
            <input
              type="time"
              value={newWorkStart}
              onChange={(e) => setNewWorkStart(e.target.value)}
              disabled={disabled}
            />
          </label>
          <label>
            Selesai
            <input
              type="time"
              value={newWorkEnd}
              onChange={(e) => setNewWorkEnd(e.target.value)}
              disabled={disabled}
            />
          </label>
          <button type="button" onClick={addWorkBlock} disabled={disabled}>
            Tambah Blok Kerja
          </button>
        </div>
        {workBlocks.length > 0 && (
          <ul style={{ marginTop: '0.5rem' }}>
            {workBlocks.map((b, i) => (
              <li key={`${b.day}-${b.start}-${b.end}-${i}`}>
                Hari {b.day}: {b.start} - {b.end}{' '}
                <button type="button" onClick={() => removeWorkBlock(i)} disabled={disabled}>
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="submit" disabled={disabled} style={{ marginTop: '0.75rem' }}>
        Run GA
      </button>
    </form>
  );
}

export default GaConfigForm;
