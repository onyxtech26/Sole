"use client";

import { useEffect, useState, useCallback } from "react";
import { formatMoney } from "@/lib/types";
import BookingModal from "@/components/bookings/booking-modal";

type Row = {
  id: number; reference: string; serviceDate: string; startTime: string; productName: string;
  phone: string; language: string; status: string; amountCents: number; pax: number;
};
const TABS = ["today", "upcoming", "past", "cancelled", "all"] as const;

export default function ReservationsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("today");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

  const fetchReservations = useCallback(() => {
    setLoading(true);
    fetch(`/api/bookings?tab=${tab}`)
      .then((r) => r.json())
      .then((d) => setRows(d.bookings || []))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const openModal = (id: number | null) => {
    setSelectedBookingId(id);
    setIsModalOpen(true);
  };

  const handleSaveSuccess = () => {
    setIsModalOpen(false);
    fetchReservations();
  };

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">RESERVATIONS</p>
          <h1>Reservations</h1>
        </div>
        <div className="top-actions">
          <button className="primary-button" onClick={() => openModal(null)}>
            + New Booking
          </button>
        </div>
      </header>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t} className={`tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Time</th><th>Tour</th><th>Reference</th><th>Pax</th>
                <th>Phone</th><th>Language</th><th>Value</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => openModal(r.id)} style={{ cursor: "pointer" }}>
                  <td className="tnum">{r.serviceDate}</td>
                  <td className="tnum">{(r.startTime || "").slice(0, 5)}</td>
                  <td>{r.productName}</td>
                  <td className="tnum">{r.reference}</td>
                  <td className="tnum">{r.pax}</td>
                  <td className="tnum">{r.phone}</td>
                  <td>{r.language}</td>
                  <td className="tnum">{formatMoney(r.amountCents)}</td>
                  <td><span className={`badge ${r.status.toLowerCase()}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div className="empty-state">Loading…</div>}
          {!loading && rows.length === 0 && <div className="empty-state">No reservations.</div>}
        </div>
      </div>

      <BookingModal
        isOpen={isModalOpen}
        bookingId={selectedBookingId}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSuccess}
      />
    </>
  );
}
