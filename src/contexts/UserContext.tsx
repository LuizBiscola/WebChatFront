import React, { createContext, useContext, ReactNode } from 'react';
import { User } from '../types';

interface UserContextType {
  user: User;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  user: User;
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ user, children }) => {
  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
};