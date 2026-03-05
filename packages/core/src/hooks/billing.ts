'use client';

import { useOptionalFabrk } from '../context';

export function useBilling() {
  const fabrk = useOptionalFabrk();
  return fabrk?.registry.getPayment() ?? null;
}
