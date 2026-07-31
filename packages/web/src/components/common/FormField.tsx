import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

type FormFieldProps = {
  name: string;
  label: string;
  optional?: boolean;
  error?: string;
  children: ReactNode;
};

// NOTE: this component only renders the label + error text. The CALLER (each step
// component) is responsible for wiring `aria-invalid`/`aria-describedby` on the actual
// input element it passes as `children` — this keeps the input/error association explicit
// at the point where the input is registered with React Hook Form.
export function FormField({ name, label, optional, error, children }: FormFieldProps) {
  return (
    <div className="mb-4">
      <Label htmlFor={name}>
        {label}
        {optional && <span className="text-muted-foreground"> (opcional)</span>}
      </Label>
      <div className="mt-2">{children}</div>
      {error && (
        <p id={`${name}-error`} role="alert" className="mt-1 text-sm text-destructive-text">
          {error}
        </p>
      )}
    </div>
  );
}
