"use client";

import { useEffect, useState } from "react";
import { todayRome, centsToDecimal, decimalToCents } from "@/lib/types";

type ProductOption = {
  id: number;
  productId: number;
  code: string;
  name: string;
  capacity: number;
};

type Product = {
  id: number;
  name: string;
  shortName: string;
  options: ProductOption[];
};

type TravellerState = {
  id?: number;
  firstName: string;
  lastName: string;
  type: "Adult" | "Child" | "Infant";
  isLead: boolean;
  dateOfBirth: string;
  nationality: string;
  grossDecimal: string;
  costDecimal: string;
};

type BookingModalProps = {
  isOpen: boolean;
  bookingId: number | null; // null means create new, number means edit
  onClose: () => void;
  onSave: () => void;
};

export default function BookingModal({ isOpen, bookingId, onClose, onSave }: BookingModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [reference, setReference] = useState("");
  const [source, setSource] = useState("Viator");
  const [productId, setProductId] = useState<number | "">("");
  const [productOptionId, setProductOptionId] = useState<number | "">("");
  const [serviceDate, setServiceDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState("English");
  const [currency, setCurrency] = useState("EUR");
  const [amountDecimal, setAmountDecimal] = useState("0.00");
  const [status, setStatus] = useState<string>("Pending");
  const [notes, setNotes] = useState("");
  const [version, setVersion] = useState(1);

  // Travellers
  const [travellers, setTravellers] = useState<TravellerState[]>([]);

  // 1. Load Products & Options List
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || []);
      })
      .catch((err) => console.error("Error loading products:", err));
  }, []);

  // 2. Load Booking Details if editing, otherwise set defaults
  useEffect(() => {
    if (!isOpen) return;

    if (bookingId) {
      setLoading(true);
      setError(null);
      fetch(`/api/bookings/${bookingId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
            return;
          }
          const b = data.booking;
          setReference(b.reference || "");
          setSource(b.source || "Viator");
          setProductId(b.productId || "");
          setProductOptionId(b.productOptionId || "");
          setServiceDate(b.serviceDate || "");
          setStartTime((b.startTime || "").slice(0, 5));
          setMeetingPoint(b.meetingPoint || "");
          setPhone(b.phone || "");
          setLanguage(b.language || "English");
          setCurrency(b.currency || "EUR");
          setAmountDecimal(centsToDecimal(b.amountCents || 0));
          setStatus(b.status || "Pending");
          setNotes(b.notes || "");
          setVersion(b.version || 1);

          setTravellers(
            (b.travellers || []).map((t: any) => ({
              id: t.id,
              firstName: t.firstName || "",
              lastName: t.lastName || "",
              type: t.type || "Adult",
              isLead: t.isLead || false,
              dateOfBirth: t.dateOfBirth || "",
              nationality: t.nationality || "",
              grossDecimal: centsToDecimal(t.grossCents || 0),
              costDecimal: centsToDecimal(t.costCents || 0),
            }))
          );
        })
        .catch((err) => {
          console.error("Error loading booking:", err);
          setError("Failed to load booking details");
        })
        .finally(() => setLoading(false));
    } else {
      // New Booking Setup
      setReference("");
      setSource("Viator");
      const defaultProduct = products[0];
      setProductId(defaultProduct?.id || "");
      setProductOptionId(defaultProduct?.options?.[0]?.id || "");
      setServiceDate(todayRome());
      setStartTime("09:00");
      setMeetingPoint("");
      setPhone("");
      setLanguage("English");
      setCurrency("EUR");
      setAmountDecimal("0.00");
      setStatus("Pending");
      setNotes("");
      setVersion(1);
      setTravellers([
        {
          firstName: "",
          lastName: "",
          type: "Adult",
          isLead: true,
          dateOfBirth: "",
          nationality: "",
          grossDecimal: "0.00",
          costDecimal: "0.00",
        },
      ]);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, bookingId, products]);

  // Handle Product Change
  const handleProductChange = (prodId: number) => {
    setProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod && prod.options && prod.options.length > 0) {
      setProductOptionId(prod.options[0].id);
    } else {
      setProductOptionId("");
    }
  };

  // Travellers List Modifications
  const addTraveller = () => {
    setTravellers([
      ...travellers,
      {
        firstName: "",
        lastName: "",
        type: "Adult",
        isLead: travellers.length === 0, // make first lead if none
        dateOfBirth: "",
        nationality: "",
        grossDecimal: "0.00",
        costDecimal: "0.00",
      },
    ]);
  };

  const removeTraveller = (idx: number) => {
    const isRemovingLead = travellers[idx]?.isLead;
    const nextTravellers = travellers.filter((_, i) => i !== idx);

    // If we removed the lead, assign the new first traveller as lead
    if (isRemovingLead && nextTravellers.length > 0) {
      nextTravellers[0].isLead = true;
    }
    setTravellers(nextTravellers);
  };

  const updateTraveller = (idx: number, patch: Partial<TravellerState>) => {
    setTravellers(
      travellers.map((t, i) => {
        if (i !== idx) return t;
        const updated = { ...t, ...patch };

        // Ensure only one Lead traveller exists
        if (patch.isLead) {
          // Unset all other leads in the next render cycle, handled below
        }
        return updated;
      })
    );
  };

  // Ensure exactly one Lead is selected when toggled
  const handleLeadToggle = (idx: number) => {
    setTravellers(
      travellers.map((t, i) => ({
        ...t,
        isLead: i === idx,
      }))
    );
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Validation
    if (!reference.trim()) return setError("Booking Reference is required");
    if (!productId) return setError("Product is required");
    if (!serviceDate) return setError("Service Date is required");
    if (!startTime) return setError("Start Time is required");
    if (travellers.length === 0) return setError("At least one traveller is required");

    const hasLead = travellers.some((t) => t.isLead);
    if (!hasLead) return setError("At least one traveller must be marked as the Lead traveller");

    const missingNames = travellers.some((t) => !t.firstName.trim() || !t.lastName.trim());
    if (missingNames) return setError("All travellers must have a first name and a last name");

    setSubmitting(true);
    setError(null);

    const payload = {
      reference,
      source,
      productId: Number(productId),
      productOptionId: productOptionId ? Number(productOptionId) : null,
      serviceDate,
      startTime,
      meetingPoint,
      phone,
      language,
      currency,
      amountCents: decimalToCents(amountDecimal),
      status,
      notes,
      version,
      travellers: travellers.map((t) => ({
        id: t.id,
        firstName: t.firstName.trim(),
        lastName: t.lastName.trim(),
        type: t.type,
        isLead: t.isLead,
        dateOfBirth: t.dateOfBirth || null,
        nationality: t.nationality || "",
        grossCents: decimalToCents(t.grossDecimal || 0),
        costCents: decimalToCents(t.costDecimal || 0),
      })),
    };

    try {
      const url = bookingId ? `/api/bookings/${bookingId}` : "/api/bookings";
      const method = bookingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save booking");
      }

      onSave();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while saving the booking");
    } finally {
      setSubmitting(false);
    }
  };

  // Archive Booking
  const handleArchive = async () => {
    if (!bookingId || !confirm("Are you sure you want to archive this booking?")) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to archive booking");
      onSave();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while archiving the booking");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentOptions = products.find((p) => p.id === productId)?.options || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{bookingId ? `Edit Booking: ${reference}` : "New Booking"}</h2>
          <button className="text-button" onClick={onClose} aria-label="Close modal">✕</button>
        </div>

        {loading ? (
          <div className="modal-body empty-state">Loading booking details…</div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div className="modal-body">
              {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

              <div className="modal-section-title">Booking Details</div>
              <div className="form-grid">
                <div className="field">
                  <label>Booking Reference *</label>
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. BR-12345"
                    required
                  />
                </div>
                <div className="field">
                  <label>Source</label>
                  <select value={source} onChange={(e) => setSource(e.target.value)}>
                    <option value="Viator">Viator</option>
                    <option value="Direct">Direct</option>
                    <option value="TourRadar">TourRadar</option>
                    <option value="Expedia">Expedia</option>
                    <option value="GetYourGuide">GetYourGuide</option>
                  </select>
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="field">
                  <label>Tour / Product *</label>
                  <select
                    value={productId}
                    onChange={(e) => handleProductChange(Number(e.target.value))}
                    required
                  >
                    <option value="" disabled>Select product…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.shortName || p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Tour Grade / Option</label>
                  <select
                    value={productOptionId}
                    onChange={(e) => setProductOptionId(Number(e.target.value))}
                  >
                    <option value="">No option selected</option>
                    {currentOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.code} - {o.name} (Cap: {o.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="field">
                  <label>Service Date *</label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Start Time *</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="field">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +39 333 1234567"
                  />
                </div>
                <div className="field">
                  <label>Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Italian">Italian</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                  </select>
                </div>
              </div>

              <div className="form-grid" style={{ marginTop: 14 }}>
                <div className="field">
                  <label>Total Value</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      style={{ width: 80, flexShrink: 0 }}
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={amountDecimal}
                      onChange={(e) => setAmountDecimal(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="field" style={{ marginTop: 14 }}>
                <label>Meeting Point</label>
                <input
                  value={meetingPoint}
                  onChange={(e) => setMeetingPoint(e.target.value)}
                  placeholder="e.g. Colosseum Metro Exit"
                />
              </div>

              <div className="field" style={{ marginTop: 14 }}>
                <label>Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional tour details, guest requests, guide assignments..."
                  rows={2}
                />
              </div>

              <div className="modal-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Travellers</span>
                <button type="button" className="outline-button" onClick={addTraveller} style={{ padding: "4px 10px" }}>
                  + Add Traveller
                </button>
              </div>

              {travellers.map((t, idx) => (
                <div key={idx} className="traveller-row-form">
                  <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr 130px auto auto", alignItems: "center" }}>
                    <div className="field">
                      <label>First Name *</label>
                      <input
                        value={t.firstName}
                        onChange={(e) => updateTraveller(idx, { firstName: e.target.value })}
                        placeholder="John"
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Last Name *</label>
                      <input
                        value={t.lastName}
                        onChange={(e) => updateTraveller(idx, { lastName: e.target.value })}
                        placeholder="Doe"
                        required
                      />
                    </div>
                    <div className="field">
                      <label>Type</label>
                      <select
                        value={t.type}
                        onChange={(e) => updateTraveller(idx, { type: e.target.value as any })}
                      >
                        <option value="Adult">Adult</option>
                        <option value="Child">Child</option>
                        <option value="Infant">Infant</option>
                      </select>
                    </div>
                    <div className="field" style={{ justifySelf: "center", textAlign: "center" }}>
                      <label style={{ display: "block", marginBottom: 6 }}>Lead?</label>
                      <input
                        type="checkbox"
                        checked={t.isLead}
                        onChange={() => handleLeadToggle(idx)}
                        style={{ width: "auto", cursor: "pointer", margin: "0 auto" }}
                      />
                    </div>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => removeTraveller(idx)}
                      style={{ alignSelf: "end", color: "var(--muted)", padding: "8px 0" }}
                      disabled={travellers.length === 1}
                    >
                      ✕
                    </button>
                  </div>

                  <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr", marginTop: 8 }}>
                    <div className="field">
                      <label>Date of Birth</label>
                      <input
                        type="date"
                        value={t.dateOfBirth}
                        onChange={(e) => updateTraveller(idx, { dateOfBirth: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Nationality</label>
                      <input
                        value={t.nationality}
                        onChange={(e) => updateTraveller(idx, { nationality: e.target.value })}
                        placeholder="e.g. US"
                        maxLength={80}
                      />
                    </div>
                    <div className="field">
                      <label>Gross Price (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={t.grossDecimal}
                        onChange={(e) => updateTraveller(idx, { grossDecimal: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="field">
                      <label>Cost Price (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={t.costDecimal}
                        onChange={(e) => updateTraveller(idx, { costDecimal: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              {bookingId && (
                <button
                  type="button"
                  className="outline-button"
                  onClick={handleArchive}
                  disabled={submitting}
                  style={{ marginRight: "auto", borderColor: "#dc2626", color: "#dc2626" }}
                >
                  Archive Booking
                </button>
              )}
              <button
                type="button"
                className="outline-button"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Save Booking"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
