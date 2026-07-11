"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { TravellerCard as T } from "@/lib/schedule/types";

export function TravellerCard({ t, overlay }: { t: T; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `trv-${t.id}`,
    data: { type: "traveller", travellerId: t.id, groupId: t.groupId },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  const isSplit = t.countInThisGroup < t.partySize;

  const typeLabel =
    t.type === "Adult" ? "Adult" : t.type === "Child" ? "Child" : "Infant";
  const typeBadgeClass =
    t.type === "Adult"
      ? "badge-adult"
      : t.type === "Child"
      ? "badge-child"
      : "badge-infant";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`trav-card${isDragging ? " dragging" : ""}${overlay ? " drag-overlay" : ""}`}
    >
      <span className="trav-grip" {...attributes} {...listeners} aria-label="Drag">⠿</span>

      <span className="trav-info">
        <span className="trav-name truncate">
          {t.firstName} {t.lastName}
        </span>
        <span className="trav-ref tnum">{t.bookingRef}</span>
      </span>

      <span className="trav-badges">
        <span className={`trav-type ${typeBadgeClass}`} title={typeLabel}>
          {t.type === "Adult" ? "A" : t.type === "Child" ? "C" : "I"}
        </span>
        {isSplit && (
          <span
            className="trav-split tnum"
            title={`Part of ${t.bookingRef} — ${t.partySize} travellers`}
          >
            {t.countInThisGroup}/{t.partySize}
          </span>
        )}
      </span>
    </div>
  );
}
