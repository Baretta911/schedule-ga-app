import React from 'react';
import { NUM_DAYS, SLOTS_PER_DAY } from '../config/scheduleConfig.js';

/* ── Activity config ──────────────────────────────────── */
const ACTIVITY = {
  0: { label: 'Waktu Luang',  icon: '🎯', bg: '#eef2ff', text: '#3730a3', accent: '#6366f1', border: '#c7d2fe' },
  1: { label: 'Kerja',        icon: '💼', bg: '#d1fae5', text: '#064e3b', accent: '#10b981', border: '#a7f3d0' },
  2: { label: 'Kuliah',       icon: '🎓', bg: '#fef3c7', text: '#78350f', accent: '#f59e0b', border: '#fde68a' },
  3: { label: 'Power Nap',    icon: '💤', bg: '#ede9fe', text: '#4c1d95', accent: '#8b5cf6', border: '#c4b5fd' },
  4: { label: 'Tidur',        icon: '😴', bg: '#dbeafe', text: '#1e3a8a', accent: '#3b82f6', border: '#bfdbfe' }
};

const ACTIVITY_ORDER = [4, 0, 1, 2, 3];

const DAYS_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

/* Hour markers for the Gantt axis */
const GANTT_HOURS  = [0, 3, 6, 9, 12, 15, 18, 21, 24];
const GANTT_LABELS = ['00:00','03:00','06:00','09:00','12:00','15:00','18:00','21:00','24:00'];

/* ── Utils ─────────────────────────────────────────────── */
function slotToTime(slot, slotsPerDay) {
  const minsPerSlot    = (24 * 60) / slotsPerDay;
  const totalMins      = Math.round(slot * minsPerSlot);
  const hh = String(Math.floor(totalMins / 60) % 24).padStart(2, '0');
  const mm = String(totalMins % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function buildDailyBlocks(chromosome, numDays, slotsPerDay) {
  if (!chromosome || chromosome.length === 0) return [];
  const result = [];
  for (let day = 0; day < numDays; day++) {
    const base = day * slotsPerDay;
    const limit = base + slotsPerDay;
    const blocks = [];
    let cursor = base;
    while (cursor < limit && cursor < chromosome.length) {
      const gene = chromosome[cursor];
      let next = cursor + 1;
      while (next < limit && next < chromosome.length && chromosome[next] === gene) next++;
      blocks.push({ gene, startSlot: cursor - base, endSlot: next - base });
      cursor = next;
    }
    result.push({ day: day + 1, blocks });
  }
  return result;
}

function summarizeByDay(chromosome, numDays, slotsPerDay) {
  if (!chromosome) return [];
  return Array.from({ length: numDays }, (_, day) => {
    const start = day * slotsPerDay;
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    for (let i = start; i < start + slotsPerDay && i < chromosome.length; i++) {
      const g = chromosome[i];
      if (counts[g] !== undefined) counts[g]++;
    }
    return { day: day + 1, counts };
  });
}

function slotsToHours(slots, slotsPerDay) {
  return ((slots * 24) / slotsPerDay).toFixed(1);
}

/* ── StatCard ──────────────────────────────────────────── */
function StatCard({ label, value, sub, accent = '#6366f1' }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 14,
      padding: '1rem 1.1rem',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      borderTop: `3px solid ${accent}`
    }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

/* ── Weekly Gantt Chart ─────────────────────────────────
   Horizontal layout: Y = hari, X = jam (00:00–24:00)
   Jauh lebih mudah dibaca daripada kolom vertikal.
──────────────────────────────────────────────────────── */
const LABEL_W  = 52;  // px — lebar kolom label hari
const ROW_H    = 48;  // px — tinggi tiap baris hari
const HDR_H    = 28;  // px — tinggi header jam

function GanttTimeAxis({ style = {} }) {
  return (
    <div style={{ position: 'relative', height: HDR_H, ...style }}>
      {GANTT_HOURS.map((h, i) => (
        <span
          key={h}
          style={{
            position: 'absolute',
            left: `${(h / 24) * 100}%`,
            transform: 'translateX(-50%)',
            fontSize: '0.67rem', fontWeight: 600,
            color: h % 6 === 0 ? '#6b7280' : '#c4c9d4',
            top: 7, whiteSpace: 'nowrap', userSelect: 'none'
          }}
        >
          {GANTT_LABELS[i]}
        </span>
      ))}
    </div>
  );
}

function GanttRow({ dayInfo, slotsPerDay, isLast }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      borderBottom: isLast ? 'none' : '1px solid #f0f2f7'
    }}>
      {/* Day label */}
      <div style={{
        width: LABEL_W, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        borderRight: '2px solid #e5e7eb',
        padding: '0.25rem 0'
      }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4f46e5' }}>
          {DAYS_SHORT[dayInfo.day - 1] ?? `H${dayInfo.day}`}
        </span>
        <span style={{ fontSize: '0.62rem', color: '#9ca3af', marginTop: 1 }}>Hari {dayInfo.day}</span>
      </div>

      {/* Bar area */}
      <div style={{ flex: 1, position: 'relative', height: ROW_H }}>
        {/* Gridlines: every 3h faint, every 6h stronger */}
        {GANTT_HOURS.map((h) => h > 0 && h < 24 && (
          <div key={h} style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${(h / 24) * 100}%`,
            borderLeft: h % 6 === 0
              ? '1px solid #e2e8f0'
              : '1px dashed #f0f2f7',
            zIndex: 0
          }} />
        ))}

        {/* Activity bars */}
        {dayInfo.blocks.map((block, i) => {
          const act       = ACTIVITY[block.gene] || ACTIVITY[0];
          const leftPct   = (block.startSlot / slotsPerDay) * 100;
          const widthPct  = ((block.endSlot - block.startSlot) / slotsPerDay) * 100;
          const durationH = slotsToHours(block.endSlot - block.startSlot, slotsPerDay);
          const startT    = slotToTime(block.startSlot, slotsPerDay);
          const endT      = slotToTime(block.endSlot,   slotsPerDay);
          const showIcon  = widthPct >= 5;
          const showLabel = widthPct >= 11;
          const showDur   = widthPct >= 18;

          return (
            <div
              key={i}
              title={`${act.icon} ${act.label}\n${startT} – ${endT} (${durationH} jam)`}
              style={{
                position: 'absolute',
                left: `calc(${leftPct}% + 1px)`,
                width: `calc(${widthPct}% - 2px)`,
                top: 4, bottom: 4,
                background: act.bg,
                borderTop: `3px solid ${act.accent}`,
                borderRadius: 6,
                display: 'flex', alignItems: 'center',
                padding: '0 5px', gap: '0.2rem',
                overflow: 'hidden', zIndex: 1, cursor: 'default'
              }}
            >
              {showIcon  && <span style={{ fontSize: '0.72rem', flexShrink: 0 }}>{act.icon}</span>}
              {showLabel && (
                <span style={{
                  fontSize: '0.63rem', fontWeight: 700,
                  color: act.text, whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {act.label}
                </span>
              )}
              {showDur && (
                <span style={{
                  fontSize: '0.58rem', color: act.text, opacity: 0.65,
                  whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 'auto'
                }}>
                  {durationH}j
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyGantt({ dailyBlocks, slotsPerDay, numDays }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
    }}>
      {/* Top axis */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #e5e7eb',
        background: '#f8fafc'
      }}>
        <div style={{ width: LABEL_W, flexShrink: 0, borderRight: '2px solid #e5e7eb' }} />
        <GanttTimeAxis style={{ flex: 1 }} />
      </div>

      {/* Day rows */}
      {dailyBlocks.map((dayInfo, idx) => (
        <GanttRow
          key={dayInfo.day}
          dayInfo={dayInfo}
          slotsPerDay={slotsPerDay}
          isLast={idx === numDays - 1}
        />
      ))}

      {/* Bottom axis echo */}
      <div style={{
        display: 'flex',
        borderTop: '1px solid #e5e7eb',
        background: '#f8fafc'
      }}>
        <div style={{ width: LABEL_W, flexShrink: 0, borderRight: '2px solid #e5e7eb' }} />
        <GanttTimeAxis style={{ flex: 1 }} />
      </div>
    </div>
  );
}

/* ── Text list for one day ─────────────────────────────── */
function DayTextCard({ dayInfo, slotsPerDay, dayLabel }) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
    }}>
      <div style={{ padding: '0.6rem 0.9rem', background: '#f8faff', borderBottom: '1px solid #e5e7eb' }}>
        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#374151' }}>{dayLabel}</span>
      </div>
      <div style={{ padding: '0.6rem 0.9rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {dayInfo.blocks.map((block, i) => {
          const act = ACTIVITY[block.gene] || ACTIVITY[0];
          const durationH = slotsToHours(block.endSlot - block.startSlot, slotsPerDay);
          return (
            <div
              key={i}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: act.bg,
                borderLeft: `3px solid ${act.accent}`,
                borderRadius: 7,
                padding: '0.28rem 0.55rem 0.28rem 0.45rem',
                gap: '0.4rem'
              }}
            >
              <span style={{ fontSize: '0.79rem', fontWeight: 600, color: act.text }}>
                {act.icon} {act.label}
              </span>
              <span style={{ fontSize: '0.73rem', color: act.text, opacity: 0.75, whiteSpace: 'nowrap' }}>
                {slotToTime(block.startSlot, slotsPerDay)}–{slotToTime(block.endSlot, slotsPerDay)} ({durationH}j)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main ──────────────────────────────────────────────── */
function ScheduleViewer({
  bestIndividual,
  stats,
  numDays   = NUM_DAYS,
  slotsPerDay = SLOTS_PER_DAY,
  totalSlots  = numDays * slotsPerDay,
  metaSource  = 'fallback'
}) {
  if (!bestIndividual) return null;

  const dailyBlocks = buildDailyBlocks(bestIndividual.chromosome, numDays, slotsPerDay);
  const byDay       = summarizeByDay(bestIndividual.chromosome, numDays, slotsPerDay);

  const hasStats    = Array.isArray(stats?.bestFitnessPerGeneration) && stats.bestFitnessPerGeneration.length > 0;
  const firstFit    = hasStats ? stats.bestFitnessPerGeneration[0] : null;
  const lastFit     = hasStats ? stats.bestFitnessPerGeneration[stats.bestFitnessPerGeneration.length - 1] : null;
  const improvement = hasStats ? firstFit - lastFit : null;
  const genCount    = hasStats ? stats.bestFitnessPerGeneration.length : 0;

  const sectionTitle = (text) => (
    <h3 style={{ margin: '1.6rem 0 0.65rem', fontWeight: 800, fontSize: '1rem', color: '#111827' }}>{text}</h3>
  );

  return (
    <div style={{ marginTop: '1.5rem' }}>

      {/* ── Results header ─────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        border: '1px solid #a7f3d0', borderRadius: 14,
        padding: '1rem 1.25rem', marginBottom: '1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem'
      }}>
        <span style={{ fontSize: '1.6rem' }}>✅</span>
        <div>
          <div style={{ fontWeight: 800, color: '#065f46', fontSize: '1rem' }}>Optimasi Selesai!</div>
          <div style={{ fontSize: '0.82rem', color: '#047857', marginTop: 2 }}>
            Jadwal terbaik ditemukan dalam {genCount} generasi &mdash; {numDays} hari, {slotsPerDay} slot/hari
          </div>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.7rem' }}>
        <StatCard label="Fitness Terbaik"  value={bestIndividual.fitness.toFixed(2)} sub="Makin kecil makin baik" accent="#6366f1" />
        <StatCard label="Total Generasi"   value={genCount}                           sub="Iterasi algoritma"     accent="#8b5cf6" />
        <StatCard label="Perbaikan Fitness" value={improvement != null ? improvement.toFixed(2) : '—'} sub={firstFit ? `${firstFit.toFixed(0)} → ${lastFit?.toFixed(0)}` : 'Tidak tersedia'} accent="#10b981" />
        <StatCard label="Slot Teroptimasi"  value={totalSlots}                        sub={`${numDays} hari × ${slotsPerDay} slot`} accent="#f59e0b" />
      </div>

      {/* ── Weekly Gantt ─────────────────────────── */}
      {sectionTitle('🗓 Tampilan Visual Jadwal Mingguan')}
      <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.9rem', marginTop: '-0.4rem', lineHeight: 1.55 }}>
        Setiap baris = 1 hari &nbsp;·&nbsp; Sumbu horizontal = jam (00:00 – 24:00) &nbsp;·&nbsp;
        Lebar blok proporsional dengan durasi &nbsp;·&nbsp; Arahkan kursor ke blok untuk detail waktu.
      </p>

      {/* Activity legend inline */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.45rem 1rem',
        marginBottom: '0.9rem'
      }}>
        {ACTIVITY_ORDER.map((key) => {
          const a = ACTIVITY[key];
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#374151' }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: a.accent, flexShrink: 0, display: 'inline-block', borderTop: `3px solid ${a.accent}` }} />
              {a.icon} {a.label}
            </div>
          );
        })}
      </div>

      <WeeklyGantt
        dailyBlocks={dailyBlocks}
        slotsPerDay={slotsPerDay}
        numDays={numDays}
      />

      {/* ── Text detail per day ─────────────────── */}
      {sectionTitle('📋 Detail Jadwal per Hari (Jam Tepat)')}
      <p style={{ fontSize: '0.82rem', color: '#9ca3af', marginBottom: '0.85rem', marginTop: '-0.4rem' }}>
        Klik blok di timeline atas untuk tooltip; daftar detail ada di bawah ini.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '0.7rem' }}>
        {dailyBlocks.map((dayInfo) => (
          <DayTextCard
            key={dayInfo.day}
            dayInfo={dayInfo}
            slotsPerDay={slotsPerDay}
            dayLabel={`Hari ${dayInfo.day} — ${DAYS_SHORT[dayInfo.day - 1] ?? ''}`}
          />
        ))}
      </div>

      {/* ── Summary table ───────────────────────── */}
      {sectionTitle('📊 Ringkasan Jam per Aktivitas')}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse',
          background: '#fff', borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', fontSize: '0.87rem'
        }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={TH}>Hari</th>
              {ACTIVITY_ORDER.map((key) => {
                const a = ACTIVITY[key];
                return (
                  <th key={a.label} style={{ ...TH, color: a.text }}>{a.icon} {a.label}</th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {byDay.map((d, rowIdx) => (
              <tr key={d.day} style={{ background: rowIdx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ ...TD, fontWeight: 600, color: '#374151' }}>
                  {DAYS_SHORT[d.day - 1] ?? `Hari ${d.day}`}
                </td>
                {ACTIVITY_ORDER.map((gene) => {
                  const act = ACTIVITY[gene];
                  const h   = slotsToHours(d.counts[gene], slotsPerDay);
                  return (
                    <td key={gene} style={{ ...TD, color: act.text, background: d.counts[gene] > 0 ? act.bg : 'transparent' }}>
                      {h}j
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.5rem' }}>
        1 slot = 30 menit &mdash; j = jam
      </p>
    </div>
  );
}

const TH = {
  padding: '0.65rem 0.75rem',
  textAlign: 'left',
  fontWeight: 700,
  fontSize: '0.8rem',
  color: '#6b7280',
  borderBottom: '1px solid #e5e7eb',
  whiteSpace: 'nowrap'
};

const TD = {
  padding: '0.55rem 0.75rem',
  borderBottom: '1px solid #f3f4f6',
  fontSize: '0.85rem'
};

export default ScheduleViewer;
