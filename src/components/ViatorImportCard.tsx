import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Upload, FileSpreadsheet, Info, CheckCircle2, AlertCircle, Loader2, Languages, ShieldCheck } from 'lucide-react';
import { Booking } from '../types';
import { planImport, ImportOutcome } from '../utils/viatorFile';

interface ViatorImportCardProps {
  bookings: Booking[];
  onAddBookings: (bookings: Booking[]) => void;
}

// Daily Viator report importer: reads the Italian .xlsx/.csv, keeps only
// Confirmed + Modified rows, translates to English, and upserts by booking
// reference (updating changed records, preserving manual passenger names).
export default function ViatorImportCard({ bookings, onAddBookings }: ViatorImportCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setOutcome(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please choose the Viator report file first.');
      return;
    }
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      const plan = await planImport(file, bookings);
      if (plan.toUpsert.length > 0) onAddBookings(plan.toUpsert);
      setOutcome(plan);
    } catch (e: any) {
      setError(e?.message || 'Could not read the file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.35 }}
      className="bg-theme-panel backdrop-blur-xl border border-theme-border rounded-2xl p-6 shadow-xl shadow-black/[0.01]"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-extrabold text-theme-text font-sans flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-orange-600" />
            Viator Daily Report Import
          </h3>
          <p className="text-theme-muted text-sm mt-0.5">
            Upload the daily Viator bookings report (<code className="font-mono text-xs bg-white/60 px-1 py-0.5 rounded border border-theme-border">.xlsx</code> or <code className="font-mono text-xs bg-white/60 px-1 py-0.5 rounded border border-theme-border">.csv</code>). New bookings are added and modified ones updated automatically.
          </p>
        </div>
      </div>

      {/* Feature chips explaining the import rules */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Confirmed + Modified only
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1">
          <AlertCircle className="w-3.5 h-3.5" /> Cancelled ignored
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1">
          <Languages className="w-3.5 h-3.5" /> Italian → English
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> No duplicates (upsert by reference)
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-grow">
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            id="viator-import-input"
            className="hidden"
            onChange={(e) => {
              setOutcome(null);
              setError(null);
              setFile(e.target.files?.[0] || null);
            }}
          />
          <label
            htmlFor="viator-import-input"
            className="flex items-center justify-between gap-4 border border-theme-border bg-white/50 hover:bg-white/80 text-theme-text rounded-xl px-4 py-3.5 cursor-pointer text-sm font-semibold transition"
          >
            <span className="truncate max-w-[240px]">{file ? file.name : 'Choose Viator report file…'}</span>
            <Upload className="w-4 h-4 text-theme-muted shrink-0" />
          </label>
        </div>
        <button
          onClick={handleImport}
          disabled={busy || !file}
          className="bg-orange-600 hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-orange-600/10 transition shrink-0 text-sm flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>{busy ? 'Importing…' : 'Import Bookings'}</span>
        </button>
        {(outcome || error) && (
          <button
            onClick={reset}
            className="text-xs font-bold text-theme-muted hover:text-theme-text px-3 py-3.5 transition"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3.5 rounded-xl text-xs flex items-start gap-2 border bg-rose-500/10 border-rose-500/20 text-rose-600 font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {outcome && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20"
        >
          <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm mb-3">
            <CheckCircle2 className="w-4.5 h-4.5" />
            <span>Import complete — {outcome.total} rows read from the report.</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <Stat label="New" value={outcome.newCount} tone="emerald" />
            <Stat label="Updated" value={outcome.updatedCount} tone="orange" />
            <Stat label="Unchanged" value={outcome.unchangedCount} tone="slate" />
            <Stat label="Cancelled skipped" value={outcome.skippedCancelled} tone="rose" />
            <Stat label="Invalid skipped" value={outcome.skippedInvalid} tone="slate" />
          </div>
          <p className="text-[11px] text-theme-muted mt-3 flex items-start gap-1.5 font-medium">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Only the lead passenger name comes from Viator. Open a booking under <strong>Reservations</strong> to add the other passenger names — they are preserved on the next daily import.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'orange' | 'rose' | 'slate' }) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    orange: 'text-orange-700 bg-orange-50 border-orange-200',
    rose: 'text-rose-700 bg-rose-50 border-rose-200',
    slate: 'text-slate-700 bg-slate-50 border-slate-200',
  };
  return (
    <div className={`rounded-xl border px-2 py-2.5 ${tones[tone]}`}>
      <div className="text-xl font-black leading-none">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-wider mt-1 opacity-80">{label}</div>
    </div>
  );
}
