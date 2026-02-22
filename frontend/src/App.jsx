import React, { useEffect, useState } from 'react';
import GaConfigForm from './components/GaConfigForm.jsx';
import ScheduleViewer from './components/ScheduleViewer.jsx';
import { getGaMeta, runGa } from './services/apiClient.js';
import { NUM_DAYS, SLOTS_PER_DAY } from './config/scheduleConfig.js';

/* ── Spinner ─────────────────────────────────────────────── */
function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 18, height: 18,
      border: '2.5px solid #c7d2fe',
      borderTopColor: '#6366f1',
      borderRadius: '50%',
      animation: 'spin 0.75s linear infinite',
      verticalAlign: 'middle',
      marginRight: 10
    }} />
  );
}

/* ── App ─────────────────────────────────────────────────── */
function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [result, setResult]   = useState(null);
  const [scheduleMeta, setScheduleMeta] = useState({
    numDays:    NUM_DAYS,
    slotsPerDay: SLOTS_PER_DAY,
    totalSlots: NUM_DAYS * SLOTS_PER_DAY
  });
  const [metaSource, setMetaSource] = useState('fallback');

  useEffect(() => {
    let mounted = true;
    const loadMeta = async () => {
      try {
        const meta        = await getGaMeta();
        const numDays     = Number(meta?.schedule?.numDays);
        const slotsPerDay = Number(meta?.schedule?.slotsPerDay);
        if (!mounted) return;
        if (Number.isFinite(numDays) && numDays > 0 && Number.isFinite(slotsPerDay) && slotsPerDay > 0) {
          const nd = Math.trunc(numDays);
          const sp = Math.trunc(slotsPerDay);
          setScheduleMeta({ numDays: nd, slotsPerDay: sp, totalSlots: nd * sp });
          setMetaSource('backend');
        }
      } catch { setMetaSource('fallback'); }
    };
    loadMeta();
    return () => { mounted = false; };
  }, []);

  const handleRunGa = async (config) => {
    setLoading(true);
    setError(null);
    try {
      const data = await runGa(config);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan tak diketahui.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Spinner keyframe injected once */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>

      {/* ── Header bar ──────────────────────────── */}
      <header style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
        padding: '0',
        boxShadow: '0 4px 20px rgba(99,102,241,0.25)'
      }}>
        <div style={{ maxWidth: 1020, margin: '0 auto', padding: '1.4rem 1.5rem 1.3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.35rem', flexShrink: 0
            }}>📅</div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                Optimasi Jadwal Mingguan
              </h1>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                Jadwal 7 hari otomatis &mdash; seimbang antara kuliah, kerja &amp; istirahat
              </p>
            </div>
          </div>

          {/* Quick badges */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {[
              { icon: '⚡', text: 'Pilih Preset' },
              { icon: '🎓', text: 'Tambah Jadwal Kuliah' },
              { icon: '💼', text: 'Tambah Jadwal Kerja' },
              { icon: '▶', text: 'Jalankan Optimasi' }
            ].map((step, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                background: 'rgba(255,255,255,0.18)', color: '#fff',
                borderRadius: 99, padding: '0.28rem 0.75rem', fontSize: '0.78rem', fontWeight: 500
              }}>
                <span>{step.icon}</span>{step.text}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────── */}
      <main style={{ maxWidth: 1020, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }}>

        {/* Meta info strip */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          gap: '0.5rem', fontSize: '0.78rem', color: 'var(--color-text-secondary)',
          marginBottom: '1.25rem'
        }}>
          <span>⚙ Konfigurasi:</span>
          <Tag color={metaSource === 'backend' ? 'green' : 'amber'}>
            {scheduleMeta.numDays} hari · {scheduleMeta.slotsPerDay} slot/hari · {scheduleMeta.totalSlots} slot total
          </Tag>
          <Tag color={metaSource === 'backend' ? 'green' : 'amber'}>
            {metaSource === 'backend' ? 'Dari server' : 'Fallback lokal'}
          </Tag>
        </div>

        {/* Form */}
        <GaConfigForm
          onRun={handleRunGa}
          disabled={loading}
          numDays={scheduleMeta.numDays}
          slotsPerDay={scheduleMeta.slotsPerDay}
        />

        {/* Loading */}
        {loading && (
          <div style={{
            marginTop: '1.25rem',
            display: 'flex', alignItems: 'center',
            background: '#eef2ff', border: '1px solid #c7d2fe',
            borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem',
            color: '#4338ca', fontWeight: 500, fontSize: '0.93rem',
            animation: 'fadeIn 0.3s ease'
          }}>
            <Spinner />
            Algoritma sedang berjalan… Biasanya selesai dalam beberapa detik.
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginTop: '1.25rem',
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem',
            color: '#b91c1c', fontSize: '0.9rem', whiteSpace: 'pre-wrap',
            animation: 'fadeIn 0.3s ease'
          }}>
            <strong>⚠ Terjadi kendala</strong>{'\n'}{error}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div style={{ animation: 'fadeIn 0.4s ease' }}>
            <ScheduleViewer
              bestIndividual={result.bestIndividual}
              stats={result.stats}
              numDays={scheduleMeta.numDays}
              slotsPerDay={scheduleMeta.slotsPerDay}
              totalSlots={scheduleMeta.totalSlots}
              metaSource={metaSource}
            />
          </div>
        )}
      </main>
    </>
  );
}

/* Tiny tag helper */
function Tag({ color = 'gray', children }) {
  const colors = {
    green: { bg: '#d1fae5', text: '#065f46' },
    amber: { bg: '#fef3c7', text: '#92400e' },
    indigo: { bg: '#eef2ff', text: '#4338ca' },
    gray:  { bg: '#f3f4f6', text: '#374151' }
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{
      display: 'inline-block',
      background: c.bg, color: c.text,
      borderRadius: 99, padding: '0.2rem 0.6rem',
      fontSize: '0.75rem', fontWeight: 600
    }}>{children}</span>
  );
}

export default App;
