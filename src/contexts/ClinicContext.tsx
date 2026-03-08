import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPermissions, Permission } from "@/lib/permissions";

type Clinic = {
  id: string;
  name: string;
  slug: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_url: string | null;
};

type ClinicContextType = {
  currentClinic: Clinic | null;
  clinics: Clinic[];
  role: string | null;
  permissions: Permission[];
  setCurrentClinicId: (id: string) => void;
  isLoading: boolean;
  refetch: () => Promise<void>;
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

  const fetchClinics = useCallback(async () => {
    if (!user) { setIsLoading(false); return; }
    
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

    // Determine current clinic
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

  // Update role when switching clinic
  useEffect(() => {
    if (!currentClinicId || !user) return;
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
  }, [currentClinicId, user]);

  const currentClinic = clinics.find((c) => c.id === currentClinicId) || null;
  const permissions = getPermissions(role);

  return (
    <ClinicContext.Provider value={{
      currentClinic,
      clinics,
      role,
      permissions,
      setCurrentClinicId: (id: string) => setCurrentClinicId(id),
      isLoading,
      refetch: fetchClinics,
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
