/** Joins class names, dropping falsy entries. */
export const cn = (...xs: (string | false | null | undefined)[]): string => xs.filter(Boolean).join(" ");
