export const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "matiasweschta@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
