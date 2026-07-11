"use client";

import { useState } from "react";

export default function ReportsPage() {
  const [date, setDate] = useState("2026-07-12");
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">REPORTING</p>
          <h1>Daily manifest</h1>
        </div>
      </header>

      <div className="panel" style={{ maxWidth: 460 }}>
        <div className="panel-heading">Generate PDF manifest</div>
        <div style={{ padding: 18, display: "grid", gap: 14 }}>
          <p className="muted" style={{ fontSize: 13 }}>
            One block per tour group, continuous numbering, split bookings flagged, and a
            management summary. Generated from the schedule board — never re-typed.
          </p>
          <div className="field">
            <label htmlFor="d">Service date</label>
            <input id="d" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ maxWidth: 200 }} />
          </div>
          <a className="primary-button" style={{ width: "fit-content" }} href={`/api/reports/pdf?date=${date}`}>
            Download manifest PDF
          </a>
        </div>
      </div>
    </>
  );
}
