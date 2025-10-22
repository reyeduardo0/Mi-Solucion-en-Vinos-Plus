import React, { createContext, useContext, useMemo } from 'react';
import { User, Role, Permission } from '../types';

interface PermissionsContextType {
  can: (permission: Permission) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

interface PermissionsProviderProps {
  children: React.ReactNode;
  user: User | null;
  roles: Role[];
}

export const PermissionsProvider: React.FC<PermissionsProviderProps> = ({ children, user, roles }) => {
  const userPermissions = useMemo(() => {
    if (!user || !user.roleId) {
      return new Set<Permission | '*'>();
    }
    const userRole = roles.find(role => role.id === user.roleId);
    return new Set<Permission | '*'>(userRole?.permissions || []);
  }, [user, roles]);

  const can = (permission: Permission): boolean => {
    if (userPermissions.has('*')) {
      return true;
    }
    return userPermissions.has(permission);
  };

  const value = { can };

  // FIX: Replaced JSX with React.createElement to resolve parsing errors in a .ts file.
  return React.createElement(PermissionsContext.Provider, { value: value }, children);
};