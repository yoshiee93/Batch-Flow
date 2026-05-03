import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiValidationError } from "./fetchApi";

export function applyServerFieldErrors<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  knownFields?: ReadonlyArray<Path<T>>,
): { handled: boolean; unmatched: Record<string, string> } {
  if (!(err instanceof ApiValidationError)) return { handled: false, unmatched: {} };
  const entries = Object.entries(err.fields);
  if (entries.length === 0) return { handled: false, unmatched: {} };
  const unmatched: Record<string, string> = {};
  let firstSet = false;
  for (const [name, message] of entries) {
    if (knownFields && !knownFields.includes(name as Path<T>)) {
      unmatched[name] = message;
      continue;
    }
    setError(name as Path<T>, { type: "server", message }, { shouldFocus: !firstSet });
    firstSet = true;
  }
  return { handled: firstSet, unmatched };
}
