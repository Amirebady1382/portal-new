import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import apiClient from "@/lib/api-client";

interface User {
  id: number;
  username: string;
  role: string;
  fullName: string;
  department?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ user: User; token: string }>;
  logout: () => void;
  updateUserData: (userData: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => 
    localStorage.getItem("auth_token")
  );
  
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    enabled: !!token,
    retry: false,
  });

  const login = async (username: string, password: string) => {
    try {
      const data = await apiClient.post("/api/auth/login", {
        username,
        password,
      });
      
      const responseData = data.data;
      
      setToken(responseData.token);
      localStorage.setItem("auth_token", responseData.token);
      
      // Invalidate and refetch user data immediately
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      // Add a small delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return responseData;
    } catch (error: any) {
      throw new Error(error.message || "خطا در ورود");
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem("auth_token");
    queryClient.clear();
  };

  const updateUserData = (userData: User) => {
    queryClient.setQueryData(["/api/auth/me"], userData);
  };

  // Token management - handled by axios interceptors

  // Handle token expiration
  useEffect(() => {
    if (token && !user && !isLoading) {
      // Token might be expired
      logout();
    }
  }, [token, user, isLoading]);

  return (
    <AuthContext.Provider value={{ user: user ?? null, login, logout, updateUserData, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
