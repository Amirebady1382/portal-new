import { useAuth } from "@/hooks/use-auth";

interface HasRoleProps {
  roles?: string[];
  department?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function HasRole({ roles, department, children, fallback = null }: HasRoleProps) {
  const { user } = useAuth();

  if (!user) {
    return <>{fallback}</>;
  }

  // Check role
  if (roles && !roles.includes(user.role)) {
    return <>{fallback}</>;
  }

  // Check department - CEO has access to all departments
  if (department && user.role !== "ceo") {
    if (!user.department || !department.includes(user.department)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}
