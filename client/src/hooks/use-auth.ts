import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type User } from "@shared/schema";

const USER_ID_KEY = "pump_bingo_user_id";

export function useAuth() {
  const queryClient = useQueryClient();
  const storedId = localStorage.getItem(USER_ID_KEY);

  // GET /api/auth/me/:id
  const { data: user, isLoading } = useQuery({
    queryKey: [api.auth.me.path, storedId],
    queryFn: async () => {
      console.log("Fetching user for storedId:", storedId);
      if (!storedId) return null;
      const url = buildUrl(api.auth.me.path, { id: storedId });
      const res = await fetch(url);
      if (res.status === 404) {
        console.log("User not found (404), removing storedId");
        localStorage.removeItem(USER_ID_KEY);
        return null;
      }
      if (!res.ok) throw new Error("Failed to fetch user");
      const data = await res.json();
      console.log("User fetched successfully:", data);
      return api.auth.me.responses[200].parse(data);
    },
    enabled: !!storedId,
  });

  // POST /api/auth/login
  const loginMutation = useMutation({
    mutationFn: async (username: string) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) throw new Error("Login failed");
      // Could be 200 or 201, types are same
      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: (newUser) => {
      localStorage.setItem(USER_ID_KEY, String(newUser.id));
      queryClient.setQueryData([api.auth.me.path, String(newUser.id)], newUser);
    },
  });

  const logout = () => {
    localStorage.removeItem(USER_ID_KEY);
    queryClient.setQueryData([api.auth.me.path, storedId], null);
    queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    // Instead of reload, we just clear the user state which triggers UI updates
  };

  return {
    user,
    isLoading,
    login: loginMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    logout,
  };
}
