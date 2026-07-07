import React, { createContext, useContext, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";

interface MiraContextType {
  isOpen: boolean;
  openMira: (prefilledQuestion?: string) => void;
  closeMira: () => void;
  toggleMira: () => void;
  prefilledQuestion: string | null;
  clearPrefill: () => void;
  currentPage: string;
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;
}

const MiraContext = createContext<MiraContextType | undefined>(undefined);

export function MiraProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefilledQuestion, setPrefilledQuestion] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const location = useLocation();

  const openMira = useCallback((prefill?: string) => {
    if (prefill) {
      setPrefilledQuestion(prefill);
    }
    setIsOpen(true);
  }, []);

  const closeMira = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleMira = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const clearPrefill = useCallback(() => {
    setPrefilledQuestion(null);
  }, []);

  // Map route to friendly page name
  const getPageName = (pathname: string): string => {
    const routes: Record<string, string> = {
      "/": "Home",
      "/inventory": "Inventory",
      "/clients": "Clients",
      "/reports": "Reports",
      "/new-bowl": "New Bowl",
      "/staff": "Staff",
      "/settings": "Settings",
    };
    return routes[pathname] || pathname;
  };

  return (
    <MiraContext.Provider
      value={{
        isOpen,
        openMira,
        closeMira,
        toggleMira,
        prefilledQuestion,
        clearPrefill,
        currentPage: getPageName(location.pathname),
        selectedClientId,
        setSelectedClientId,
      }}
    >
      {children}
    </MiraContext.Provider>
  );
}

export function useMiraContext() {
  const context = useContext(MiraContext);
  if (context === undefined) {
    throw new Error("useMiraContext must be used within a MiraProvider");
  }
  return context;
}
