"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ChallengeData {
  challengeId: string;
  challengerId: string;
  challengedId: string;
}

interface LogMatchContextType {
  isOpen: boolean;
  challengeData: ChallengeData | null;
  openModal: (challengeData?: ChallengeData) => void;
  closeModal: () => void;
}

const LogMatchContext = createContext<LogMatchContextType | null>(null);

export function LogMatchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [challengeData, setChallengeData] = useState<ChallengeData | null>(null);

  const openModal = (data?: ChallengeData) => {
    setChallengeData(data || null);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setChallengeData(null);
  };

  return (
    <LogMatchContext.Provider value={{ isOpen, challengeData, openModal, closeModal }}>
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
