import { subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';

export const DEFAULT_PRESETS: Array<{ label: string; getValue: () => DateRange }> = [
  {
    label: 'Today',
    getValue: () => ({ from: new Date(), to: new Date() }),
  },
  {
    label: 'Yesterday',
    getValue: () => ({
      from: subDays(new Date(), 1),
      to: subDays(new Date(), 1),
    }),
  },
  {
    label: 'Last 7 days',
    getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }),
  },
  {
    label: 'Last 30 days',
    getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }),
  },
  {
    label: 'This month',
    getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }),
  },
  {
    label: 'Last month',
    getValue: () => ({
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(subMonths(new Date(), 1)),
    }),
  },
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
