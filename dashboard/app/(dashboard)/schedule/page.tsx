"use client";

import { useEffect, useState, useCallback } from "react";
import { ScheduleBoard } from "@/components/schedule/schedule-board";
import type { BoardData } from "@/lib/schedule/types";

function todayRome() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
}
function shift(date: string, days: number) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}
function label(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

export default function SchedulePage() {
  // Demo seed lives on 2026-07-12; default there so the client sees data immediately.
  const [date, setDate] = useState("2026-07-12");
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoGrouping, setAutoGrouping] = useState(false);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    const res = await fetch(`/api/schedule?date=${d}`);
    const data = res.ok ? await res.json() : null;
    setBoard(data);
    setLoading(false);
  }, []);

  const handleAutoGroup = async () => {
    setAutoGrouping(true);
    try {
      const res = await fetch(`/api/schedule/auto-group?date=${date}`, {
        method: "POST",
      });
      if (res.ok) {
        await load(date);
      } else {
        alert("Failed to auto-group");
      }
    } catch (e) {
      console.error(e);
      alert("Error auto-grouping travellers");
    } finally {
      setAutoGrouping(false);
    }
  };

  useEffect(() => { load(date); }, [date, load]);

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">DAILY OPERATIONS</p>
          <h1>Schedule</h1>
        </div>
        <div className="top-actions">
          <button className="primary-button" onClick={handleAutoGroup} disabled={autoGrouping || loading} style={{ marginRight: 8 }}>
            {autoGrouping ? "Grouping…" : "Auto-group"}
          </button>
          <a className="outline-button" href={`/api/reports/pdf?date=${date}`}>Print manifest</a>
        </div>
      </header>

      <div className="board-toolbar">
        <div className="date-nav">
          <button onClick={() => setDate(shift(date, -1))} aria-label="Previous day">◀</button>
          <span className="date-label">{label(date)}</span>
          <button onClick={() => setDate(shift(date, 1))} aria-label="Next day">▶</button>
          <button className="text-button" onClick={() => setDate(todayRome())}>Today</button>
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 160 }} />
      </div>

      {loading && <p className="muted">Loading…</p>}
      {!loading && board && (board.groups.length || board.unassigned.length) ? (
        <ScheduleBoard key={date} initial={board} />
      ) : !loading ? (
        <div className="empty-state">No travellers booked for this day.</div>
      ) : null}
    </>
  );
}
