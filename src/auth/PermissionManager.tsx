import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from './AuthProvider';

interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  actions: string[];
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

interface Resource {
  id: string;
  name: string;
  description: string;
  type: 'table' | 'function' | 'api' | 'ui';
  actions: string[];
  createdAt: string;
  updatedAt: string;
}

interface Props {
  supabaseUrl: string;
  supabaseKey: string;
}

export function PermissionManager({ supabaseUrl, supabaseKey }: Props) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // טעינת הרשאות
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('*')
        .order('name');

      if (permissionsError) throw permissionsError;
      setPermissions(permissionsData);

      // טעינת תפקידים
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (rolesError) throw rolesError;
      setRoles(rolesData);

      // טעינת משאבים
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('resources')
        .select('*')
        .order('name');

      if (resourcesError) throw resourcesError;
      setResources(resourcesData);
    } catch (error: any) {
      console.error('Error loading permissions data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createPermission = async (permission: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('permissions')
        .insert({
          ...permission,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setPermissions(prev => [...prev, data]);
      return data;
    } catch (error: any) {
      console.error('Error creating permission:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (id: string, updates: Partial<Permission>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('permissions')
        .update({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setPermissions(prev => prev.map(p => p.id === id ? data : p));
      return data;
    } catch (error: any) {
      console.error('Error updating permission:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deletePermission = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('permissions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPermissions(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      console.error('Error deleting permission:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createRole = async (role: Omit<Role, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('roles')
        .insert({
          ...role,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setRoles(prev => [...prev, data]);
      return data;
    } catch (error: any) {
      console.error('Error creating role:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (id: string, updates: Partial<Role>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('roles')
        .update({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setRoles(prev => prev.map(r => r.id === id ? data : r));
      return data;
    } catch (error: any) {
      console.error('Error updating role:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteRole = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRoles(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      console.error('Error deleting role:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createResource = async (resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('resources')
        .insert({
          ...resource,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setResources(prev => [...prev, data]);
      return data;
    } catch (error: any) {
      console.error('Error creating resource:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateResource = async (id: string, updates: Partial<Resource>) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('resources')
        .update({
          ...updates,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setResources(prev => prev.map(r => r.id === id ? data : r));
      return data;
    } catch (error: any) {
      console.error('Error updating resource:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteResource = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setResources(prev => prev.filter(r => r.id !== id));
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const assignPermissionToRole = async (roleId: string, permissionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const role = roles.find(r => r.id === roleId);
      if (!role) throw new Error('תפקיד לא נמצא');

      const updatedPermissions = [...role.permissions, permissionId];
      await updateRole(roleId, { permissions: updatedPermissions });
    } catch (error: any) {
      console.error('Error assigning permission to role:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removePermissionFromRole = async (roleId: string, permissionId: string) => {
    try {
      setLoading(true);
      setError(null);

      const role = roles.find(r => r.id === roleId);
      if (!role) throw new Error('תפקיד לא נמצא');

      const updatedPermissions = role.permissions.filter(id => id !== permissionId);
      await updateRole(roleId, { permissions: updatedPermissions });
    } catch (error: any) {
      console.error('Error removing permission from role:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = (roleId: string, resource: string, action: string): boolean => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return false;

    return role.permissions.some(permissionId => {
      const permission = permissions.find(p => p.id === permissionId);
      return permission?.resource === resource && permission?.actions.includes(action);
    });
  };

  return {
    permissions,
    roles,
    resources,
    loading,
    error,
    createPermission,
    updatePermission,
    deletePermission,
    createRole,
    updateRole,
    deleteRole,
    createResource,
    updateResource,
    deleteResource,
    assignPermissionToRole,
    removePermissionFromRole,
    checkPermission,
  };
} 