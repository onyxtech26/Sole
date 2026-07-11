"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useMemo } from "react";
import { TravellerCard } from "./traveller-card";
import type { GroupCard } from "@/lib/schedule/types";

export function GroupColumn({
  group,
  guides,
  onPatch,
  onDelete,
}: {
  group: GroupCard;
  guides: { id: number; name: string }[];
  onPatch: (id: number, patch: Record<string, unknown>) => void;
  onDelete: (id: number) => void;
}) {
  const count = group.travellers.length;
  const over = count > group.capacity;
  const full = count === group.capacity && count > 0;
  const noGuide = group.guideId === null;

  // Use prefixed ID "grp-{id}" to match schedule-board findContainer logic
  const { setNodeRef, isOver } = useDroppable({
    id: `grp-${group.id}`,
    data: { type: "group", groupId: group.id },
  });
  const itemIds = useMemo(() => group.travellers.map((t) => `trv-${t.id}`), [group.travellers]);

  // Capacity badge: red when over, amber when at capacity
  const capBadgeClass = over ? "cap-badge cap-over" : full ? "cap-badge cap-full" : "cap-badge";

  return (
    <div className={`group-card${over ? " over" : ""}${full ? " full" : ""}${noGuide ? " no-guide" : ""}`}>
      <div className="group-head">
        <div className="group-title">
          <span className="truncate">{group.productName}</span>
          {group.optionCode && <span className="grp-label">{group.optionCode}</span>}
        </div>
        <div className="group-times tnum">
          {group.departureTime || "—:—"} · ticket {group.ticketTime || "—:—"}
        </div>
        <div className="group-guide">
          Guide: {group.guideName || "—"} {noGuide && <span title="No guide assigned">⚠</span>}
        </div>
        {/* Capacity badge: "{current} / {capacity}" */}
        <div className={capBadgeClass}>
          {count} / {group.capacity}
          {over && <span className="over-flag">OVER ⚠</span>}
          {full && !over && <span className="full-flag">FULL</span>}
        </div>
      </div>

      <div ref={setNodeRef} className={`group-body${isOver ? " drop-active" : ""}`}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {group.travellers.map((t) => (
            <TravellerCard key={t.id} t={t} />
          ))}
        </SortableContext>
        {count === 0 && <div className="empty-state" style={{ padding: 12, fontSize: 12 }}>Drop travellers here</div>}
      </div>

      <div className="group-foot">
        <select
          value={group.guideId ?? ""}
          onChange={(e) => onPatch(group.id, { guideId: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">No guide</option>
          {guides.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <button className="text-button" title="Delete group" onClick={() => onDelete(group.id)}>Delete</button>
      </div>
    </div>
  );
}
