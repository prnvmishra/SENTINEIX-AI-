export const ROUTES = {
  landing: "/",
  login: "/login",
  signup: "/signup",
  dashboard: "/dashboard",
  analytics: "/dashboard/analytics",
  settings: "/dashboard/settings",
  docs: "/docs",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
