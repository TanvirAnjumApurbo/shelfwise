export const getRedirectForRole = (role?: string | null) =>
  role === "ADMIN" ? "/admin" : "/";
