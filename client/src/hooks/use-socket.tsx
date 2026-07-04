import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./use-auth";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // اگر کاربر وجود ندارد، connection موجود را disconnect کن
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // اگر connection قبلی وجود دارد، آن را disconnect کن
    if (socket) {
      socket.disconnect();
    }

    // Create socket connection with proper error handling
    const token = localStorage.getItem("auth_token");
    if (!token) {
      console.warn("No auth token available for socket connection");
      return;
    }

    const newSocket = io({
      auth: {
        token: token,
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Setup event handlers with proper error handling
    newSocket.on("connect", () => {
      if (process.env.NODE_ENV === "development") {
        console.log("Socket connected");
      }
      setIsConnected(true);
    });

    newSocket.on("disconnect", (reason) => {
      if (process.env.NODE_ENV === "development") {
        console.log("Socket disconnected:", reason);
      }
      setIsConnected(false);
    });

    newSocket.on("error", (error: any) => {
      console.error("Socket error:", error);
      setIsConnected(false);
    });

    // Handle heartbeat from server
    newSocket.on("heartbeat", (data) => {
      if (process.env.NODE_ENV === "development") {
        console.log("Heartbeat received:", data.timestamp);
      }
    });

    // Handle connection errors
    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup function
    return () => {
      if (newSocket) {
        newSocket.removeAllListeners();
        newSocket.disconnect();
      }
      setIsConnected(false);
    };
  }, [user?.id]); // فقط وقتی user.id تغییر کند، socket را دوباره وصل کن

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
} 