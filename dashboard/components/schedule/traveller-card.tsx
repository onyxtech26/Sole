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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`trav-card${isDragging ? " dragging" : ""}${overlay ? " drag-overlay" : ""}`}
    >
      <span className="trav-grip" {...attributes} {...listeners} aria-label="Drag">⠿</span>
      <span className="trav-name truncate">
        {t.firstName} {t.lastName}
      </span>
      {isSplit && (
        <span className="trav-split tnum" title={`Part of ${t.bookingRef} — ${t.partySize} travellers`}>
          {t.countInThisGroup} of {t.partySize}
        </span>
      )}
      <span className="trav-type">{t.type === "Adult" ? "A" : t.type === "Child" ? "C" : "I"}</span>
    </div>
  );
}
