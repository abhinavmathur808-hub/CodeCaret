import { createContext, useContext } from "react";

/**
 * Auth context object. Lives in its own module so that
 * AuthContext.jsx only ever exports a component — otherwise
 * react-refresh cannot hot-reload the provider.
 */
export const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
