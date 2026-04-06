import React, { createContext, useContext } from 'react';

const InviteCodeContext = createContext<string | null>(null);

export const InviteCodeProvider = InviteCodeContext.Provider;

export function useInviteCode(): string | null {
  return useContext(InviteCodeContext);
}
