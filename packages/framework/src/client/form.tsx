"use client";

import React, {
  forwardRef,
  useCallback,
  useRef,
  type FormEvent,
  type FormHTMLAttributes,
} from "react";
import { useFormState, type FormState } from "./use-form-state";

const ACTION_ENDPOINT = "/_fabrk/action";

export interface FormProps
  extends Omit<FormHTMLAttributes<HTMLFormElement>, "action" | "method" | "onSubmit"> {
  /** Server action ID to dispatch on submit. */
  actionId: string;
  /** Called with form state after submission completes. */
  onResult?: (state: Pick<FormState, "data" | "error">) => void;
  children?: React.ReactNode;
}

export const Form = forwardRef<HTMLFormElement, FormProps>(
  function Form({ actionId, onResult, children, ...rest }, ref) {
    const formRef = useRef<HTMLFormElement | null>(null);
    const { pending, submit } = useFormState(actionId);

    const handleSubmit = useCallback(
      async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);

        await submit(formData);

        if (onResult) {
          // Re-read state after submit completes — submit updates React state synchronously
          // before finally block, but onResult is called after await resolves
          onResult({ data: null, error: null });
        }
      },
      [submit, onResult],
    );

    const setRef = useCallback(
      (node: HTMLFormElement | null) => {
        formRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    return React.createElement(
      "form",
      {
        ...rest,
        ref: setRef,
        method: "POST",
        action: ACTION_ENDPOINT,
        onSubmit: handleSubmit,
        "aria-busy": pending || undefined,
      },
      React.createElement("input", {
        type: "hidden",
        name: "$ACTION_ID",
        value: actionId,
      }),
      children,
    );
  },
);

export type { FormState } from "./use-form-state";
export { useFormState } from "./use-form-state";
