const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (value: string): boolean => EMAIL_RE.test(value);

export const requiredLength = (value: unknown, min: number, max: number): value is string =>
  typeof value === "string" && value.trim().length >= min && value.trim().length <= max;

/** Trusting the error path — never echo the value back to the client. */
export const stripNewlines = (value: string): string => value.replace(/[\r\n]+/g, " ").trim();
