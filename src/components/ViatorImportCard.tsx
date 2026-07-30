import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileSpreadsheet, Info, CheckCircle2, AlertCircle, Loader2, Languages, ShieldCheck, ChevronDown, History, Clock, User as UserIcon, FileText } from 'lucide-react';
import { Booking, ImportBatch, User } from '../types';
import { planImport, ImportOutcome } from '../utils/viatorFile';
import { usePersistentValue, writeStore } from '../utils/storage';

const IMPORTS_STORAGE_KEY = 'sole_imports';

interface ViatorImportCardProps {
  bookings: Booking[];
  currentUser?: User;
  onAddBookings: (bookings: Booking[]) => void;
}

/** "2.4 MB" / "812 KB" — keeps the history rows readable at a glance. */
function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "30 Jul 2026, 14:32" in the operator's local timezone. */
function formatStamp(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Daily Viator report importer: reads the Italian .xlsx/.csv, keeps only
// Confirmed + Modified rows, translates to English, and upserts by booking
// reference (updating changed records, preserving manual passenger names).
export default function ViatorImportCard({ bookings, currentUser, onAddBookings }: ViatorImportCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Shared, append-only upload log — every teammate sees the same history live.
  const history = usePersistentValue<ImportBatch[]>(IMPORTS_STORAGE_KEY, []);
  const recentFirst = [...history].sort((a, b) => (b.importedAt || '').localeCompare(a.importedAt || ''));

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

      // Append this upload to the shared history so the team can audit what was
      // imported, by whom, and when — without re-reading the file.
      const batch: ImportBatch = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fileName: file.name,
        fileSize: file.size,
        importedAt: new Date().toISOString(),
        importedByName: currentUser?.fullName || currentUser?.username || 'Unknown',
        rowsTotal: plan.total,
        rowsAdded: plan.newCount,
        rowsUpdated: plan.updatedCount,
        rowsUnchanged: plan.unchangedCount,
        rowsCancelled: plan.skippedCancelled,
        rowsInvalid: plan.skippedInvalid,
        source: 'viator',
      };
      writeStore(IMPORTS_STORAGE_KEY, [...history, batch]);
      setHistoryOpen(true);
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
        <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Confirmed + Modified only
        </span>
        <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1">
          <AlertCircle className="w-3.5 h-3.5" /> Cancelled ignored
        </span>
        <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1">
          <Languages className="w-3.5 h-3.5" /> Italian → English
        </span>
        <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
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
            <span className="truncate max-w-[15rem]">{file ? file.name : 'Choose Viator report file…'}</span>
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
          <p className="text-[0.6875rem] text-theme-muted mt-3 flex items-start gap-1.5 font-medium">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Only the lead passenger name comes from Viator. Open a booking under <strong>Reservations</strong> to add the other passenger names — they are preserved on the next daily import.
          </p>
        </motion.div>
      )}

      {/* ─── Upload history (collapsible) ─── */}
      <div className="mt-5 pt-5 border-t border-theme-border">
        <button
          onClick={() => setHistoryOpen(o => !o)}
          aria-expanded={historyOpen}
          className="w-full flex items-center gap-3 group cursor-pointer text-left"
        >
          <span className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-orange-600 group-hover:border-orange-100 group-hover:bg-orange-50 transition shrink-0">
            <History className="w-4 h-4" />
          </span>
          <span className="flex-grow min-w-0">
            <span className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-theme-text">Upload History</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[0.625rem] font-extrabold text-slate-600">
                {recentFirst.length}
              </span>
            </span>
            <span className="block text-[0.6875rem] text-theme-muted font-semibold mt-0.5">
              {recentFirst.length === 0
                ? 'No reports uploaded yet.'
                : `Last upload ${formatStamp(recentFirst[0].importedAt)} by ${recentFirst[0].importedByName || 'Unknown'}.`}
            </span>
          </span>
          <motion.span
            animate={{ rotate: historyOpen ? 180 : 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-400 group-hover:text-orange-600 group-hover:border-orange-100 transition shrink-0"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {historyOpen && (
            <motion.div
              key="import-history"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-2.5">
                {recentFirst.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                    <FileSpreadsheet className="w-7 h-7 text-slate-300" />
                    <p className="text-xs font-bold text-slate-500">No uploads recorded yet</p>
                    <p className="text-[0.6875rem] text-slate-400 font-semibold max-w-[16.25rem] leading-relaxed">
                      Import a Viator report above and it will be logged here for the whole team.
                    </p>
                  </div>
                ) : (
                  recentFirst.map((h, idx) => (
                    <motion.div
                      key={h.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(idx, 6) * 0.04 }}
                      className="relative bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-orange-100 transition"
                    >
                      {idx === 0 && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[0.5625rem] font-extrabold text-emerald-700 uppercase tracking-wider">
                          Latest
                        </span>
                      )}

                      <div className="flex items-start gap-3">
                        <span className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                          <FileText className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-grow">
                          <div className="font-extrabold text-xs text-slate-800 truncate pr-16" title={h.fileName}>
                            {h.fileName || 'Untitled report'}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[0.625rem] font-semibold text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {formatStamp(h.importedAt)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <UserIcon className="w-3 h-3" /> {h.importedByName || 'Unknown'}
                            </span>
                            <span className="font-mono">{formatBytes(h.fileSize)}</span>
                            <span className="font-mono">{h.rowsTotal} rows read</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3.5 pt-3.5 border-t border-slate-100">
                        <HistoryStat label="New" value={h.rowsAdded} tone="emerald" />
                        <HistoryStat label="Updated" value={h.rowsUpdated} tone="orange" />
                        <HistoryStat label="Unchanged" value={h.rowsUnchanged} tone="slate" />
                        <HistoryStat label="Cancelled" value={h.rowsCancelled} tone="rose" />
                        <HistoryStat label="Invalid" value={h.rowsInvalid} tone="slate" />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function HistoryStat({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'orange' | 'rose' | 'slate' }) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    orange: 'text-orange-700 bg-orange-50 border-orange-200',
    rose: 'text-rose-700 bg-rose-50 border-rose-200',
    slate: 'text-slate-600 bg-slate-50 border-slate-200',
  };
  return (
    <div className={`rounded-lg border px-1.5 py-1.5 text-center ${tones[tone]}`}>
      <div className="text-sm font-black leading-none">{value}</div>
      <div className="text-[0.5rem] font-bold uppercase tracking-wider mt-1 opacity-80">{label}</div>
    </div>
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
      <div className="text-[0.5625rem] font-bold uppercase tracking-wider mt-1 opacity-80">{label}</div>
    </div>
  );
}
