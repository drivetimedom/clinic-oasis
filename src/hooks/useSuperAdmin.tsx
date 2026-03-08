import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useSuperAdmin() {
  const { user } = useAuth();

  const { data: isSuperAdmin = false, isLoading } = useQuery({
    queryKey: ["is_super_admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_super_admin", {
        _user_id: user!.id,
      });

      if (error) {
        console.error("Failed to check super admin status:", error);
        return false;
      }

      return Boolean(data);
    },
    enabled: !!user,
  });

  return { isSuperAdmin, isLoading };
}
