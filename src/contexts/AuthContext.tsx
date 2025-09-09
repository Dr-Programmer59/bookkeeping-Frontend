  import React, { createContext, useContext, useState, useEffect } from 'react';
  import { authAPI } from '@/lib/api';
  import { jwtDecode } from 'jwt-decode';

  export type UserRole = 'admin' | 'worker';

  export interface User {
    user_id: string;
    email: string;
    name: string;
    role: UserRole;
  }

  interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
  }

  interface JWTPayload {
    user_id: string;
    email: string;
    name: string;
    role: UserRole;
    exp: number;
  }

  const AuthContext = createContext<AuthContextType | undefined>(undefined);

  export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      // On mount, fetch user info from backend if session exists
      const fetchUser = async () => {
        setIsLoading(true);
        try {
          const response = await authAPI.getMe();
          setUser(response.data);
        } catch {
          setUser(null);
        }
        setIsLoading(false);
      };
      fetchUser();
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      try {
        await authAPI.login({ email, password });
        
        // Fetch user info from backend after login
        const response = await authAPI.getMe();
        setUser(response.data);
        setIsLoading(false);
        return true;
      } catch (error) {
        setIsLoading(false);
        // If backend is not available, set user to null and continue
        setUser(null);
        console.warn('Backend server not available. Please ensure the backend is running.');
      }
    };

    const logout = () => {
      setUser(null);
      // Optionally, call backend to clear session/cookie
    };

    return (
      <AuthContext.Provider value={{ user, login, logout, isLoading }}>
        {children}
      </AuthContext.Provider>
    );
  };

  export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
  };