// The browser reports its IANA timezone via this cookie (timezone-sync.tsx
// writes it, today.ts reads it). Kept in its own file because the writer is
// a client component and the reader imports next/headers — neither may
// import the other.
export const TIMEZONE_COOKIE = "tz";
