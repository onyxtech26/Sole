import type { StoreData, User } from '../types';
import type { Screen } from '../utils/access';
import type { RangeState } from '../components/DateRangeBar';
import type { ConfirmSpec } from '../ui/kit';

/** Everything App hands every screen. */
export interface ViewProps {
  store: StoreData;
  user: User;
  range: RangeState;
  /** The resolved [start, end] for the header's period filter. */
  rangeValue: [string, string];
  onGo: (screen: Screen, ref?: string) => void;
  setConfirm: (spec: ConfirmSpec | null) => void;
}
