import React, { useState } from 'react';
import { NUM_DAYS, SLOTS_PER_DAY } from '../config/scheduleConfig.js';

/* ── Design constants ──────────────────────────────────── */
const C = {
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    padding: '1.25rem 1.4rem',
    marginBottom: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.35rem'
  },
  input: {
    width: '100%',
    padding: '0.55rem 0.7rem',
    borderRadius: 8,
    border: '1.5px solid #d1d5db',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    color: '#111827',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s'
  }
};

const PRESETS = {
  cepat: {
    icon: '⚡',
    label: 'Cepat',
    desc: '~5 detik',
    accent: '#f59e0b',
    accentBg: '#fffbeb',
    accentBorder: '#fcd34d',
    maxGenerations: 70, populationSize: 50, crossoverRate: 0.8, mutationRate: 0.2, earlyStopPatience: 18
  },
  seimbang: {
    icon: '⚖',
    label: 'Seimbang',
    desc: 'Disarankan',
    accent: '#6366f1',
    accentBg: '#eef2ff',
    accentBorder: '#a5b4fc',
    maxGenerations: 120, populationSize: 80, crossoverRate: 0.8, mutationRate: 0.2, earlyStopPatience: 30
  },
  teliti: {
    icon: '🔬',
    label: 'Teliti',
    desc: 'Lebih akurat',
    accent: '#10b981',
    accentBg: '#ecfdf5',
    accentBorder: '#6ee7b7',
    maxGenerations: 220, populationSize: 130, crossoverRate: 0.82, mutationRate: 0.18, earlyStopPatience: 60
  }
};

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

/* ── Helper: SectionHeader ───────────────────────────── */
function SectionHeader({ icon, title, desc, accentColor = '#6366f1' }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.1rem' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: accentColor + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.05rem'
      }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.97rem', color: '#111827' }}>{title}</div>
        {desc && <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>{desc}</div>}
      </div>
    </div>
  );
}

/* ── Helper: FieldGroup ────────────────────────────── */
function Field({ label, hint, children }) {
  return (
    <div>
      <label style={C.label}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: 4 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

/* ── Helper: BlockChip ────────────────────────────── */
function BlockChip({ block, onRemove, disabled, color }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
      background: color.bg, color: color.text,
      border: `1px solid ${color.border}`,
      borderRadius: 99, padding: '0.3rem 0.7rem 0.3rem 0.55rem',
      fontSize: '0.82rem', fontWeight: 500
    }}>
      <span style={{
        width: 16, height: 16, borderRadius: 99,
        background: color.accent, display: 'inline-block', flexShrink: 0
      }} />
      Hari {block.day} &nbsp;{block.start}–{block.end}
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: color.text, opacity: 0.5, padding: '0 0 0 2px',
            fontSize: '0.85rem', lineHeight: 1, marginLeft: 2
          }}
          title="Hapus"
        >✕</button>
      )}
    </div>
  );
}

/* ── Main Component ─────────────────────────────────── */
function GaConfigForm({ onRun, disabled, numDays = NUM_DAYS, slotsPerDay = SLOTS_PER_DAY }) {
  const [maxGenerations, setMaxGenerations]   = useState(120);
  const [populationSize, setPopulationSize]   = useState(80);
  const [crossoverRate, setCrossoverRate]     = useState(0.8);
  const [mutationRate, setMutationRate]       = useState(0.2);
  const [earlyStopPatience, setEarlyStopPatience] = useState(30);
  const [activePreset, setActivePreset]       = useState('seimbang');

  const [studyBlocks, setStudyBlocks] = useState([]);
  const [workBlocks, setWorkBlocks]   = useState([]);

  const [newStudyDay,   setNewStudyDay]   = useState(1);
  const [newStudyStart, setNewStudyStart] = useState('08:00');
  const [newStudyEnd,   setNewStudyEnd]   = useState('10:00');

  const [newWorkDay,   setNewWorkDay]   = useState(1);
  const [newWorkStart, setNewWorkStart] = useState('09:00');
  const [newWorkEnd,   setNewWorkEnd]   = useState('17:00');

  const [overlapMessage, setOverlapMessage] = useState('');

  /* ── Helpers ─────────────────────────────────────── */
  const timeToSlot = (time) => {
    if (!time || typeof time !== 'string') return null;
    const [h, m] = time.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    if (m !== 0 && m !== 30) return null;
    if (h < 0 || h > 23) return null;
    return h * 2 + (m === 30 ? 1 : 0);
  };

  const blocksToIndices = (blocks) => {
    const s = new Set();
    blocks.forEach(({ day, start, end }) => {
      const d = Number(day);
      if (d < 1 || d > numDays) return;
      const st = timeToSlot(start);
      const en = timeToSlot(end);
      if (st == null || en == null || en <= st) return;
      const base = (d - 1) * slotsPerDay;
      for (let i = st; i < en; i++) s.add(base + i);
    });
    return Array.from(s).sort((a, b) => a - b);
  };

  const addStudy = () => {
    if ((timeToSlot(newStudyEnd) ?? 0) <= (timeToSlot(newStudyStart) ?? 0)) return;
    setStudyBlocks([...studyBlocks, { day: Number(newStudyDay), start: newStudyStart, end: newStudyEnd }]);
  };
  const addWork = () => {
    if ((timeToSlot(newWorkEnd) ?? 0) <= (timeToSlot(newWorkStart) ?? 0)) return;
    setWorkBlocks([...workBlocks, { day: Number(newWorkDay), start: newWorkStart, end: newWorkEnd }]);
  };

  const applyPreset = (key) => {
    const p = PRESETS[key];
    if (!p) return;
    setActivePreset(key);
    setMaxGenerations(p.maxGenerations);
    setPopulationSize(p.populationSize);
    setCrossoverRate(p.crossoverRate);
    setMutationRate(p.mutationRate);
    setEarlyStopPatience(p.earlyStopPatience);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fixedStudyIndices    = blocksToIndices(studyBlocks);
    const fixedWorkIndicesRaw  = blocksToIndices(workBlocks);
    const studySet             = new Set(fixedStudyIndices);
    const overlapCount         = fixedWorkIndicesRaw.filter((i) => studySet.has(i)).length;
    const fixedWorkIndices     = fixedWorkIndicesRaw.filter((i) => !studySet.has(i));
    setOverlapMessage(overlapCount > 0
      ? `${overlapCount} slot bentrok KULIAH/KERJA — otomatis diprioritaskan sebagai KULIAH.`
      : '');
    onRun({
      maxGenerations:   Number(maxGenerations),
      populationSize:   Number(populationSize),
      crossoverRate:    Number(crossoverRate),
      mutationRate:     Number(mutationRate),
      earlyStopPatience:Number(earlyStopPatience),
      fixedStudyIndices,
      fixedWorkIndices
    });
  };

  /* ── Shared input style (extends C.input with disabled state) */
  const inp = (extra = {}) => ({
    ...C.input,
    ...(disabled ? { background: '#f9fafb', color: '#9ca3af' } : {}),
    ...extra
  });

  /* ── Day selector shared UI */
  const DaySelect = ({ value, onChange }) => (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      style={{ ...inp(), width: 'auto', minWidth: 120, paddingRight: '2rem' }}
    >
      {Array.from({ length: numDays }, (_, i) => (
        <option key={i + 1} value={i + 1}>Hari {i + 1} ({DAYS[i] ?? `H${i + 1}`})</option>
      ))}
    </select>
  );

  /* ── Add-block row ──────────────────────────────── */
  const AddBlockRow = ({ type }) => {
    const isStudy = type === 'study';
    const day     = isStudy ? newStudyDay   : newWorkDay;
    const start   = isStudy ? newStudyStart : newWorkStart;
    const end     = isStudy ? newStudyEnd   : newWorkEnd;
    const setDay  = isStudy ? setNewStudyDay   : setNewWorkDay;
    const setStart= isStudy ? setNewStudyStart : setNewWorkStart;
    const setEnd  = isStudy ? setNewStudyEnd   : setNewWorkEnd;
    const onAdd   = isStudy ? addStudy : addWork;
    const btnColor= isStudy ? '#f59e0b' : '#10b981';

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto auto',
        gap: '0.6rem',
        alignItems: 'flex-end'
      }}>
        <Field label="Hari">
          <DaySelect value={day} onChange={setDay} />
        </Field>
        <Field label="Mulai">
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
            disabled={disabled} style={inp({ width: 'auto' })} />
        </Field>
        <Field label="Selesai">
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
            disabled={disabled} style={inp({ width: 'auto' })} />
        </Field>
        <div style={{ paddingBottom: 1 }}>
          <button
            type="button"
            onClick={onAdd}
            disabled={disabled}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: 8,
              border: 'none',
              background: disabled ? '#e5e7eb' : btnColor,
              color: disabled ? '#9ca3af' : '#fff',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: disabled ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            + Tambah
          </button>
        </div>
      </div>
    );
  };

  /* ── Render ─────────────────────────────────────── */
  return (
    <form onSubmit={handleSubmit}>

      {/* ── 1. Preset buttons ───────────────────── */}
      <div style={{ ...C.card }}>
        <SectionHeader icon="⚡" title="Pilih Mode Optimasi" desc="Seberapa dalam algoritma mencari jadwal terbaik" accentColor="#f59e0b" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem' }}>
          {Object.entries(PRESETS).map(([key, p]) => {
            const isActive = activePreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => applyPreset(key)}
                disabled={disabled}
                style={{
                  padding: '0.8rem 0.75rem',
                  borderRadius: 12,
                  border: isActive ? `2px solid ${p.accent}` : '2px solid transparent',
                  background: isActive ? p.accentBg : '#f9fafb',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  boxShadow: isActive ? `0 2px 8px ${p.accent}30` : 'none'
                }}
              >
                <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{p.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isActive ? p.accent : '#374151' }}>{p.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 1 }}>{p.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 2. Parameter detail (collapsible feel) ── */}
      <div style={{ ...C.card }}>
        <SectionHeader icon="🎛" title="Parameter Algoritma" desc="Nilai sudah diisi otomatis sesuai preset — ubah jika perlu" accentColor="#6366f1" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem 1rem' }}>
          {[
            { label: 'Maks. Generasi', hint: 'iterasi', value: maxGenerations, set: setMaxGenerations, min: 1, step: 1 },
            { label: 'Ukuran Populasi', hint: 'individu', value: populationSize, set: setPopulationSize, min: 2, step: 1 },
            { label: 'Crossover', hint: '0–1', value: crossoverRate, set: setCrossoverRate, min: 0, max: 1, step: 0.01 },
            { label: 'Mutasi', hint: '0–1', value: mutationRate, set: setMutationRate, min: 0, max: 1, step: 0.01 },
            { label: 'Early Stop', hint: 'stagna', value: earlyStopPatience, set: setEarlyStopPatience, min: 0, step: 1 }
          ].map(({ label, hint, value, set, ...rest }) => (
            <Field key={label} label={label} hint={hint}>
              <input
                type="number"
                value={value}
                onChange={(e) => set(e.target.value)}
                disabled={disabled}
                style={inp()}
                {...rest}
              />
            </Field>
          ))}
        </div>
      </div>

      {/* ── 3. Jadwal Kuliah ────────────────────── */}
      <div style={{ ...C.card }}>
        <SectionHeader
          icon="🎓"
          title="Jadwal Kuliah Wajib"
          desc="Slot ini akan dikunci sebagai KULIAH — sistem tidak akan mengubahnya"
          accentColor="#f59e0b"
        />
        <AddBlockRow type="study" />
        {studyBlocks.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.85rem' }}>
            {studyBlocks.map((b, i) => (
              <BlockChip
                key={`s-${i}`}
                block={b}
                onRemove={() => setStudyBlocks(studyBlocks.filter((_, j) => j !== i))}
                disabled={disabled}
                color={{ bg: '#fffbeb', text: '#78350f', border: '#fcd34d', accent: '#f59e0b' }}
              />
            ))}
          </div>
        )}
        {studyBlocks.length === 0 && (
          <p style={{ fontSize: '0.83rem', color: '#9ca3af', marginTop: '0.75rem', fontStyle: 'italic' }}>
            Belum ada blok kuliah. Tambahkan di atas jika kamu punya jadwal kuliah tetap.
          </p>
        )}
      </div>

      {/* ── 4. Jadwal Kerja ─────────────────────── */}
      <div style={{ ...C.card }}>
        <SectionHeader
          icon="💼"
          title="Jadwal Kerja Tetap"
          desc="Slot ini dikunci sebagai KERJA — jika bentrok dengan kuliah, kuliah menang"
          accentColor="#10b981"
        />
        <AddBlockRow type="work" />
        {workBlocks.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.85rem' }}>
            {workBlocks.map((b, i) => (
              <BlockChip
                key={`w-${i}`}
                block={b}
                onRemove={() => setWorkBlocks(workBlocks.filter((_, j) => j !== i))}
                disabled={disabled}
                color={{ bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7', accent: '#10b981' }}
              />
            ))}
          </div>
        )}
        {workBlocks.length === 0 && (
          <p style={{ fontSize: '0.83rem', color: '#9ca3af', marginTop: '0.75rem', fontStyle: 'italic' }}>
            Belum ada blok kerja. Opsional &mdash; lewati bagian ini jika tidak ada jadwal kerja tetap.
          </p>
        )}
      </div>

      {/* ── Overlap notice ──────────────────────── */}
      {overlapMessage && (
        <div style={{
          marginBottom: '0.75rem', borderRadius: 10,
          background: '#fffbeb', border: '1px solid #fcd34d',
          color: '#92400e', padding: '0.7rem 0.9rem', fontSize: '0.88rem'
        }}>
          ⚠ {overlapMessage}
        </div>
      )}

      {/* ── Submit ──────────────────────────────── */}
      <button
        type="submit"
        disabled={disabled}
        style={{
          width: '100%', padding: '0.9rem 1rem',
          borderRadius: 12, border: 'none',
          background: disabled
            ? '#e5e7eb'
            : 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
          color: disabled ? '#9ca3af' : '#fff',
          fontWeight: 700, fontSize: '1rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: disabled ? 'none' : '0 4px 14px rgba(99,102,241,0.35)',
          transition: 'all 0.15s',
          letterSpacing: '0.01em'
        }}
      >
        {disabled ? '⏳  Sedang memproses…' : '▶  Jalankan Optimasi'}
      </button>
    </form>
  );
}

export default GaConfigForm;
