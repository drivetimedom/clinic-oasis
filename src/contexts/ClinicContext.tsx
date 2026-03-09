import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPermissions, getPermissionsWithOverrides, Permission } from "@/lib/permissions";

type Clinic = {
  id: string;
  name: string;
  slug: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
  status: string;
  cnpj?: string | null;
  city?: string | null;
  state?: string | null;
};

type ClinicContextType = {
  currentClinic: Clinic | null;
  clinics: Clinic[];
  role: string | null;
  permissions: Permission[];
  setCurrentClinicId: (id: string) => void;
  isLoading: boolean;
  refetch: () => Promise<void>;
  isSuperAdminMode: boolean;
  exitSuperAdminMode: () => void;
};

const ClinicContext = createContext<ClinicContextType | null>(null);

export function ClinicProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [currentClinicId, setCurrentClinicId] = useState<string | null>(() => {
    return localStorage.getItem("hc_current_clinic");
  });
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);
  const [permissionOverrides, setPermissionOverrides] = useState<{ role: string; permission: string; enabled: boolean }[]>([]);

  const fetchClinics = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }

    // Check for super admin clinic override mode
    const saMode = localStorage.getItem("hc_sa_mode") === "true";
    const overrideClinicId = localStorage.getItem("hc_current_clinic");

    if (saMode && overrideClinicId) {
      const { data: isSA } = await supabase.rpc("is_super_admin", { _user_id: user.id });
      if (isSA) {
        const { data: clinic } = await supabase
          .from("clinics")
          .select("*")
          .eq("id", overrideClinicId)
          .single();
        if (clinic) {
          setClinics([clinic as Clinic]);
          setCurrentClinicId(clinic.id);
          setRole("admin");
          setIsSuperAdminMode(true);
          setIsLoading(false);
          return;
        }
      }
      // Clear invalid SA mode
      localStorage.removeItem("hc_sa_mode");
    }

    setIsSuperAdminMode(false);

    const { data: members } = await supabase
      .from("clinic_members")
      .select("clinic_id, role, clinics(*)")
      .eq("user_id", user.id);

    if (!members || members.length === 0) {
      setClinics([]);
      setCurrentClinicId(null);
      setRole(null);
      setIsLoading(false);
      return;
    }

    const clinicList = members.map((m: any) => m.clinics as Clinic);
    setClinics(clinicList);

    let activeId = currentClinicId;
    if (!activeId || !clinicList.find((c) => c.id === activeId)) {
      activeId = clinicList[0].id;
    }
    setCurrentClinicId(activeId);
    localStorage.setItem("hc_current_clinic", activeId);

    const activeMember = members.find((m: any) => m.clinic_id === activeId);
    setRole(activeMember?.role || null);
    setIsLoading(false);
  }, [user, currentClinicId]);

  useEffect(() => { fetchClinics(); }, [fetchClinics]);

  // Update role when switching clinic (only in normal mode)
  useEffect(() => {
    if (!currentClinicId || !user || isSuperAdminMode) return;
    localStorage.setItem("hc_current_clinic", currentClinicId);

    supabase
      .from("clinic_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("clinic_id", currentClinicId)
      .single()
      .then(({ data }) => {
        setRole(data?.role || null);
      });
  }, [currentClinicId, user, isSuperAdminMode]);

  const exitSuperAdminMode = useCallback(() => {
    localStorage.removeItem("hc_sa_mode");
    localStorage.removeItem("hc_current_clinic");
    setIsSuperAdminMode(false);
    window.location.href = "/admin/clinics";
  }, []);

  // Load permission overrides when clinic changes
  useEffect(() => {
    if (!currentClinicId) { setPermissionOverrides([]); return; }
    supabase
      .from("clinic_role_permissions")
      .select("role, permission, enabled")
      .eq("clinic_id", currentClinicId)
      .then(({ data }) => setPermissionOverrides(data || []));
  }, [currentClinicId]);

  const currentClinic = clinics.find((c) => c.id === currentClinicId) || null;
  const permissions = getPermissionsWithOverrides(role, permissionOverrides);

  return (
    <ClinicContext.Provider value={{
      currentClinic,
      clinics,
      role,
      permissions,
      setCurrentClinicId: (id: string) => setCurrentClinicId(id),
      isLoading,
      refetch: fetchClinics,
      isSuperAdminMode,
      exitSuperAdminMode,
    }}>
      {children}
    </ClinicContext.Provider>
  );
}

export function useClinic() {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error("useClinic must be used within ClinicProvider");
  return ctx;
}
