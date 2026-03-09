import { createContext, useContext, useState, ReactNode } from "react";

interface AttendanceModeContextType {
  isAttendanceMode: boolean;
  toggleAttendanceMode: () => void;
}

const AttendanceModeContext = createContext<AttendanceModeContextType>({
  isAttendanceMode: false,
  toggleAttendanceMode: () => {},
});

export function AttendanceModeProvider({ children }: { children: ReactNode }) {
  const [isAttendanceMode, setIsAttendanceMode] = useState(() =>
    localStorage.getItem("hc_attendance_mode") === "true"
  );

  const toggleAttendanceMode = () => {
    setIsAttendanceMode((prev) => {
      const next = !prev;
      localStorage.setItem("hc_attendance_mode", String(next));
      return next;
    });
  };

  return (
    <AttendanceModeContext.Provider value={{ isAttendanceMode, toggleAttendanceMode }}>
      {children}
    </AttendanceModeContext.Provider>
  );
}

export const useAttendanceMode = () => useContext(AttendanceModeContext);
