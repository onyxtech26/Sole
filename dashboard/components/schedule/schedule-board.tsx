"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors,
  pointerWithin, rectIntersection, type DragStartEvent, type DragOverEvent, type DragEndEvent,
  type CollisionDetection,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { GroupColumn } from "./group-column";
import { TravellerCard } from "./traveller-card";
import type { BoardData, TravellerCard as T } from "@/lib/schedule/types";

type Containers = Record<string, T[]>; // "unassigned" | `g-${groupId}`

const UNASSIGNED = "unassigned";
const gKey = (id: number) => `g-${id}`;
const containerGroupId = (key: string): number | null => (key === UNASSIGNED ? null : Number(key.slice(2)));

// pointerWithin with rectIntersection fallback (required for keyboard sensor)
const collision: CollisionDetection = (args) => {
  const p = pointerWithin(args);
  return p.length ? p : rectIntersection(args);
};

export function ScheduleBoard({ initial }: { initial: BoardData }) {
  const [board, setBoard] = useState<BoardData>(initial);
  const [containers, setContainers] = useState<Containers>(() => buildContainers(initial));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const snapshot = useRef<Containers | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function buildContainersFromState(): Containers { return containers; }

  const activeTraveller = useMemo(() => {
    if (!activeId) return null;
    const tid = Number(activeId.replace("trv-", ""));
    for (const key of Object.keys(containers)) {
      const found = containers[key].find((t) => t.id === tid);
      if (found) return found;
    }
    return null;
  }, [activeId, containers]);

  function findContainer(id: string): string | null {
    if (id in containers) return id;
    if (id === UNASSIGNED) return UNASSIGNED;
    const tid = Number(id.replace("trv-", ""));
    return Object.keys(containers).find((key) => containers[key].some((t) => t.id === tid)) || null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    snapshot.current = structuredClone(containers);
  }

  function onDragOver(e: DragOverEvent) {
    const activeIdStr = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;

    const from = findContainer(activeIdStr);
    const to = findContainer(overId) ?? (overId.startsWith("group-") ? gKey(Number(overId.slice(6))) : overId === UNASSIGNED ? UNASSIGNED : null);
    if (!from || !to || from === to) return;

    setContainers((prev) => {
      const tid = Number(activeIdStr.replace("trv-", ""));
      const item = prev[from]?.find((t) => t.id === tid);
      if (!item) return prev;
      const next: Containers = { ...prev, [from]: prev[from].filter((t) => t.id !== tid) };
      const overTid = overId.startsWith("trv-") ? Number(overId.replace("trv-", "")) : null;
      const dest = [...(next[to] || [])];
      const idx = overTid !== null ? dest.findIndex((t) => t.id === overTid) : dest.length;
      dest.splice(idx < 0 ? dest.length : idx, 0, { ...item, groupId: containerGroupId(to) });
      next[to] = dest;
      return next;
    });
  }

  async function onDragEnd(e: DragEndEvent) {
    const activeIdStr = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    setActiveId(null);
    if (!overId) return;

    const from = findContainer(activeIdStr);
    const to = findContainer(overId);
    if (from && to && from === to && activeIdStr !== overId && overId.startsWith("trv-")) {
      // reorder within same container
      setContainers((prev) => {
        const tid = Number(activeIdStr.replace("trv-", ""));
        const overTid = Number(overId.replace("trv-", ""));
        const list = prev[from];
        const oldIdx = list.findIndex((t) => t.id === tid);
        const newIdx = list.findIndex((t) => t.id === overTid);
        if (oldIdx < 0 || newIdx < 0) return prev;
        return { ...prev, [from]: arrayMove(list, oldIdx, newIdx) };
      });
    }

    // Persist the containers that changed relative to snapshot
    const before = snapshot.current;
    setContainers((cur) => {
      persist(cur, before);
      return cur;
    });
  }

  async function persist(cur: Containers, before: Containers | null) {
    if (!before) return;
    const changed = Object.keys(cur).filter(
      (key) => JSON.stringify(cur[key].map((t) => t.id)) !== JSON.stringify((before[key] || []).map((t) => t.id)),
    );
    if (!changed.length) return;

    const payload = {
      serviceDate: board.serviceDate,
      containers: changed.map((key) => ({ groupId: containerGroupId(key), travellerIds: cur[key].map((t) => t.id) })),
    };
    try {
      const res = await fetch("/api/schedule/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      if (data.warnings?.length) {
        setToast(`Saved. ${data.warnings.length} group over capacity.`);
      }
      snapshot.current = null;
      setTimeout(() => setToast(null), 2500);
    } catch {
      if (before) setContainers(before);
      setToast("Could not save. Reloaded.");
      setTimeout(() => setToast(null), 3000);
    }
  }

  async function patchGroup(id: number, patch: Record<string, unknown>) {
    setBoard((b) => ({
      ...b,
      groups: b.groups.map((g) =>
        g.id === id
          ? {
              ...g,
              ...(patch.guideId !== undefined
                ? { guideId: patch.guideId as number | null, guideName: b.guides.find((x) => x.id === patch.guideId)?.name ?? null }
                : {}),
            }
          : g,
      ),
    }));
    await fetch(`/api/schedule/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function deleteGroup(id: number) {
    await fetch(`/api/schedule/groups/${id}`, { method: "DELETE" });
    // move its travellers to unassigned locally
    setContainers((prev) => {
      const moved = prev[gKey(id)] || [];
      const rest = { ...prev };
      delete rest[gKey(id)];
      return { ...rest, [UNASSIGNED]: [...prev[UNASSIGNED], ...moved.map((t) => ({ ...t, groupId: null }))] };
    });
    setBoard((b) => ({ ...b, groups: b.groups.filter((g) => g.id !== id) }));
  }

  async function addGroup() {
    const product = board.products[0];
    const opt = board.options.find((o) => o.productId === product.id) || null;
    const res = await fetch("/api/schedule/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceDate: board.serviceDate, productId: product.id, productOptionId: opt?.id ?? null, departureTime: "09:00", ticketTime: "09:00" }),
    });
    const { id } = await res.json();
    const newGroup = {
      id, sortOrder: (board.groups.length + 1) * 10, productId: product.id, productName: product.shortName,
      optionId: opt?.id ?? null, optionCode: opt?.code ?? null, departureTime: "09:00", ticketTime: "09:00",
      ticketStatus: "", guideId: null, guideName: null, capacity: opt?.capacity ?? 7, travellers: [],
    };
    setBoard((b) => ({ ...b, groups: [...b.groups, newGroup] }));
    setContainers((prev) => ({ ...prev, [gKey(id)]: [] }));
  }

  // enrich group metadata with live traveller lists from containers
  const groupsForRender = board.groups.map((g) => ({ ...g, travellers: containers[gKey(g.id)] || [] }));
  const unassigned = (containers[UNASSIGNED] || []).filter((t) =>
    !search || `${t.firstName} ${t.lastName} ${t.bookingRef}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div className="board">
        <UnassignedRail travellers={unassigned} total={(containers[UNASSIGNED] || []).length} search={search} setSearch={setSearch} />
        <div className="groups-strip">
          {groupsForRender.map((g) => (
            <GroupColumn key={g.id} group={g} guides={board.guides} onPatch={patchGroup} onDelete={deleteGroup} />
          ))}
          <button className="outline-button" style={{ flexShrink: 0, height: 40 }} onClick={addGroup}>+ New group</button>
        </div>
      </div>

      <DragOverlay>{activeTraveller ? <TravellerCard t={activeTraveller} overlay /> : null}</DragOverlay>
      {toast && <div className="toast">{toast}</div>}
    </DndContext>
  );
}

function UnassignedRail({ travellers, total, search, setSearch }: { travellers: T[]; total: number; search: string; setSearch: (s: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: UNASSIGNED, data: { type: "unassigned" } });
  const itemIds = useMemo(() => travellers.map((t) => `trv-${t.id}`), [travellers]);
  return (
    <div className="unassigned-rail">
      <div className="rail-head">
        <strong>Unassigned</strong>
        <span className="count tnum">{total}</span>
      </div>
      <div className="rail-search">
        <input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div ref={setNodeRef} className={`rail-body${isOver ? " drop-active" : ""}`}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {travellers.map((t) => (
            <TravellerCard key={t.id} t={t} />
          ))}
        </SortableContext>
        {total === 0 && <div className="empty-state" style={{ fontSize: 12 }}>Everyone is assigned.</div>}
      </div>
    </div>
  );
}

function buildContainers(board: BoardData): Containers {
  const c: Containers = { [UNASSIGNED]: board.unassigned };
  for (const g of board.groups) c[gKey(g.id)] = g.travellers;
  return c;
}
