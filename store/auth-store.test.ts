import { describe, expect, it } from "vitest";
import { useAuthStore } from "./auth-store";

describe("useAuthStore", () => {
  it("sets auth and clears on logout", () => {
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);

    useAuthStore.getState().setAuth({
      accessToken: "token",
      user: {
        id: "u-1",
        email: "qa@pantano.ro",
        role: "admin",
      },
    });

    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    expect(useAuthStore.getState().user?.email).toBe("qa@pantano.ro");

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
