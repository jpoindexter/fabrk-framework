"use client";

import { useState, useCallback, useRef } from "react";

export interface FormState<T = unknown> {
  data: T | null;
  error: string | null;
  pending: boolean;
  submit: (formData: FormData) => Promise<void>;
}

const ACTION_ENDPOINT = "/_fabrk/action";

export function useFormState<T = unknown>(actionId: string): FormState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  const submit = useCallback(
    async (formData: FormData) => {
      if (pendingRef.current) return;
      pendingRef.current = true;
      setPending(true);
      setError(null);

      try {
        formData.set("$ACTION_ID", actionId);

        const res = await fetch(ACTION_ENDPOINT, {
          method: "POST",
          body: formData,
        });

        const json = await res.json();

        if (!res.ok) {
          setError(json.error ?? "Action failed");
          return;
        }

        setData(json.result as T);
      } catch {
        setError("Network error");
      } finally {
        pendingRef.current = false;
        setPending(false);
      }
    },
    [actionId],
  );

  return { data, error, pending, submit };
}
