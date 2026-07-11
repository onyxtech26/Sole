export type TravellerForAutoGroup = {
  id: number;
  bookingId: number;
  productId: number;
  productOptionId: number | null;
  language: string;
  bookedTime: string; // "HH:MM"
};

export type GroupForAutoGroup = {
  id: number;
  productId: number;
  productOptionId: number | null;
  language: string;
  capacity: number;
  travellers: TravellerForAutoGroup[];
};

export type AutoGroupResult = {
  // Assignments of unassigned travellers to existing groups
  existingAssignments: { travellerId: number; groupId: number }[];
  // New groups to be created, and the travellers assigned to them
  newGroups: {
    productId: number;
    productOptionId: number | null;
    capacity: number;
    departureTime: string; // HH:MM
    travellers: TravellerForAutoGroup[];
  }[];
};

/**
 * Auto-groups unassigned travellers based on product, option, and language constraints.
 * Keeps parties (travellers with the same bookingId) together and splits only when forced.
 */
export function autoGroup(
  unassigned: TravellerForAutoGroup[],
  existingGroups: GroupForAutoGroup[],
  options: { id: number; capacity: number }[]
): AutoGroupResult {
  const result: AutoGroupResult = {
    existingAssignments: [],
    newGroups: [],
  };

  // Group options capacity map for fast lookup
  const optionCapacities = new Map<number, number>();
  for (const opt of options) {
    optionCapacities.set(opt.id, opt.capacity);
  }

  // Helper to get effective capacity
  const getCapacity = (productId: number, optionId: number | null) => {
    if (optionId && optionCapacities.has(optionId)) {
      return optionCapacities.get(optionId)!;
    }
    return 7; // Default capacity is 7
  };

  // 1. Bucket by (productId, productOptionId, language)
  const buckets = new Map<
    string,
    {
      productId: number;
      productOptionId: number | null;
      language: string;
      unassigned: TravellerForAutoGroup[];
      groups: {
        id?: number; // undefined for groups created during algorithm
        capacity: number;
        travellers: TravellerForAutoGroup[];
      }[];
    }
  >();

  // Populate buckets with unassigned travellers
  for (const t of unassigned) {
    const key = `${t.productId}:${t.productOptionId ?? ""}:${t.language}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        productId: t.productId,
        productOptionId: t.productOptionId,
        language: t.language,
        unassigned: [],
        groups: [],
      });
    }
    buckets.get(key)!.unassigned.push(t);
  }

  // Populate buckets with existing groups
  for (const g of existingGroups) {
    const groupLanguage = g.travellers.length > 0 ? g.travellers[0].language : g.language || "English";
    const key = `${g.productId}:${g.productOptionId ?? ""}:${groupLanguage}`;
    if (!buckets.has(key)) {
      buckets.set(key, {
        productId: g.productId,
        productOptionId: g.productOptionId,
        language: groupLanguage,
        unassigned: [],
        groups: [],
      });
    }
    buckets.get(key)!.groups.push({
      id: g.id,
      capacity: g.capacity,
      travellers: [...g.travellers],
    });
  }

  // Process each bucket
  for (const [_, bucket] of buckets) {
    if (bucket.unassigned.length === 0) continue;

    // Group travellers into parties by bookingId
    const partyMap = new Map<number, TravellerForAutoGroup[]>();
    for (const t of bucket.unassigned) {
      if (!partyMap.has(t.bookingId)) partyMap.set(t.bookingId, []);
      partyMap.get(t.bookingId)!.push(t);
    }

    // Sort parties by size descending (First-Fit Decreasing)
    const parties = Array.from(partyMap.values()).sort((a, b) => b.length - a.length);

    const cap = getCapacity(bucket.productId, bucket.productOptionId);

    for (const party of parties) {
      let remainingParty = [...party];

      while (remainingParty.length > 0) {
        const partySize = remainingParty.length;

        // Try to place the whole remaining party in an existing group in this bucket
        let placed = false;
        if (partySize <= cap) {
          for (const g of bucket.groups) {
            const currentSize = g.travellers.length;
            if (g.capacity - currentSize >= partySize) {
              g.travellers.push(...remainingParty);
              if (g.id !== undefined) {
                for (const t of remainingParty) {
                  result.existingAssignments.push({ travellerId: t.id, groupId: g.id });
                }
              }
              remainingParty = [];
              placed = true;
              break;
            }
          }
        }

        if (placed) break;

        // If party size is <= cap but didn't fit in any existing group, open a new one
        if (partySize <= cap) {
          const newGroupTravellers = [...remainingParty];
          bucket.groups.push({
            capacity: cap,
            travellers: newGroupTravellers,
          });
          remainingParty = [];
        } else {
          // Party is larger than capacity, so we must split
          // "fill any partially-open group first, then spill"
          let filledAny = false;
          for (const g of bucket.groups) {
            const currentSize = g.travellers.length;
            const space = g.capacity - currentSize;
            if (space > 0) {
              const toAdd = remainingParty.slice(0, space);
              g.travellers.push(...toAdd);
              if (g.id !== undefined) {
                for (const t of toAdd) {
                  result.existingAssignments.push({ travellerId: t.id, groupId: g.id });
                }
              }
              remainingParty = remainingParty.slice(space);
              filledAny = true;
              break;
            }
          }

          // If no partially-open group can accept any spill, open a new group and fill it
          if (!filledAny) {
            const toAdd = remainingParty.slice(0, cap);
            bucket.groups.push({
              capacity: cap,
              travellers: toAdd,
            });
            remainingParty = remainingParty.slice(cap);
          }
        }
      }
    }

    // Collect new groups created during this bucket's processing
    const newGroupsInBucket = bucket.groups.filter((g) => g.id === undefined);
    for (const ng of newGroupsInBucket) {
      if (ng.travellers.length === 0) continue;

      // Prefill departureTime with earliest booked time in the group
      const bookedTimes = ng.travellers.map((t) => t.bookedTime).filter(Boolean);
      const earliestTime = bookedTimes.length > 0 ? bookedTimes.sort()[0] : "09:00";

      result.newGroups.push({
        productId: bucket.productId,
        productOptionId: bucket.productOptionId,
        capacity: ng.capacity,
        departureTime: earliestTime,
        travellers: ng.travellers,
      });
    }
  }

  return result;
}
