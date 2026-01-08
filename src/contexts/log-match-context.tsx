"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface LogMatchContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const LogMatchContext = createContext<LogMatchContextType | null>(null);

export function LogMatchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = () => {
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <LogMatchContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
    </LogMatchContext.Provider>
  );
}

export function useLogMatch() {
  const context = useContext(LogMatchContext);
  if (!context) {
    throw new Error("useLogMatch must be used within LogMatchProvider");
  }
  return context;
}
