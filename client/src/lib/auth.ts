import { jwtDecode } from "jwt-decode";

export interface TokenPayload {
  userId: number;
  username: string;
  role: string;
  exp: number;
  iat: number;
}

export function getTokenFromStorage(): string | null {
  try {
    return localStorage.getItem("auth_token");
  } catch {
    return null;
  }
}

export function setTokenInStorage(token: string): void {
  try {
    localStorage.setItem("auth_token", token);
  } catch (error) {
    console.error("Failed to save token:", error);
  }
}

export function removeTokenFromStorage(): void {
  try {
    localStorage.removeItem("auth_token");
  } catch (error) {
    console.error("Failed to remove token:", error);
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwtDecode<TokenPayload>(token);
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeToken(token);
    if (!decoded) return true;
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
}

export function isTokenValid(token: string): boolean {
  if (!token) return false;
  
  const decoded = decodeToken(token);
  if (!decoded) return false;
  
  return !isTokenExpired(token);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getTokenFromStorage();
  
  if (!token || !isTokenValid(token)) {
    return {};
  }
  
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function getUserFromToken(): TokenPayload | null {
  const token = getTokenFromStorage();
  
  if (!token || !isTokenValid(token)) {
    return null;
  }
  
  return decodeToken(token);
}

export function hasRole(requiredRoles: string[]): boolean {
  const user = getUserFromToken();
  
  if (!user) return false;
  
  return requiredRoles.includes(user.role);
}

export function getDashboardRoute(role: string): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "employee":
      return "/employee";
    case "customer":
      return "/customer";
    default:
      return "/login";
  }
}

export function redirectToDashboard(role: string): void {
  const route = getDashboardRoute(role);
  window.location.href = route;
}

export function logout(): void {
  removeTokenFromStorage();
  window.location.href = "/login";
}

// Auto-logout on token expiration
export function setupTokenExpirationCheck(): void {
  const checkInterval = 60000; // Check every minute
  
  setInterval(() => {
    const token = getTokenFromStorage();
    
    if (token && isTokenExpired(token)) {
      console.warn("Token expired, logging out...");
      logout();
    }
  }, checkInterval);
}

// Initialize token expiration check
if (typeof window !== "undefined") {
  setupTokenExpirationCheck();
}
