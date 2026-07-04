import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Helper function to get JWT secret with validation
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required. Please set it in your .env file.');
  }
  
  // Warn if secret is too short (security best practice) - only in development
  if (process.env.NODE_ENV !== 'production' && secret.length < 32) {
    console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters for production use.');
  }
  
  return secret;
}

export interface AuthRequest extends Request {
  user: {
    userId: number;
    username: string;
    role: string;
    department?: string;
  };
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.header("Authorization");
    
    // Check if Authorization header is present
    if (!authHeader) {
      return res.status(401).json({ message: "دسترسی غیرمجاز - توکن یافت نشد" });
    }
    
    // Check if it starts with "Bearer "
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "فرمت توکن نامعتبر است" });
    }
    
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return res.status(401).json({ message: "دسترسی غیرمجاز - توکن یافت نشد" });
    }

    // Verify and decode token
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    
    // Validate decoded token structure
    if (!decoded.userId || !decoded.role || !decoded.username) {
      return res.status(401).json({ message: "ساختار توکن نامعتبر است" });
    }
    
    (req as AuthRequest).user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      department: decoded.department,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "توکن منقضی شده است. لطفا دوباره وارد شوید" });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "توکن نامعتبر است" });
    }
    
    res.status(401).json({ message: "خطا در احراز هویت" });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "دسترسی غیرمجاز" });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "دسترسی محدود" });
    }

    next();
  };
}
