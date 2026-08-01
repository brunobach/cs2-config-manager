import type { TFunction } from "i18next";

/**
 * Closed set of error codes serialized by the Rust backend (`AppError { code, message }`).
 * Each code maps to an `errors.<code>` i18n key (see src/i18n/locales).
 */
export const API_ERROR_CODES = [
  "steam_not_found",
  "invalid_path",
  "account_not_found",
  "backup_not_found",
  "io",
  "invalid_input",
  "parse",
  "network",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export class ApiError extends Error {
  code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

function isApiErrorCode(code: unknown): code is ApiErrorCode {
  return typeof code === "string" && (API_ERROR_CODES as readonly string[]).includes(code);
}

/**
 * Normalizes an `invoke()` rejection into an ApiError. Tauri command errors
 * arrive as `{ code, message }`; anything unexpected falls back to code "io"
 * with the raw value as message.
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (typeof err === "object" && err !== null) {
    const { code, message } = err as { code?: unknown; message?: unknown };
    if (isApiErrorCode(code) && typeof message === "string") {
      return new ApiError(code, message);
    }
    if (typeof message === "string") {
      return new ApiError("io", message);
    }
  }
  if (err instanceof Error) return new ApiError("io", err.message);
  return new ApiError("io", String(err));
}

/**
 * Localized message for an unknown error: `errors.<code>` when the error is an
 * ApiError (or normalizes to one), falling back to the raw backend message
 * when no translation exists.
 */
export function errorMessage(err: unknown, t: TFunction): string {
  const apiError = toApiError(err);
  const key = `errors.${apiError.code}`;
  const translated = t(key);
  return translated === key ? apiError.message : translated;
}
