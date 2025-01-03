import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { UserPlus, Key, Shield, Users, Lock, Settings } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  permissions: Permission[];
  lastLogin?: string;
  isActive: boolean;
  createdAt: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // מזהי הרשאות
}

interface Props {
  supabaseUrl: string;
  supabaseKey: string;
  onUserCreate: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onUserUpdate: (userId: string, updates: Partial<User>) => void;
  onUserDelete: (userId: string) => void;
  onRoleCreate: (role: Omit<Role, 'id'>) => void;
  onRoleUpdate: (roleId: string, updates: Partial<Role>) => void;
  onRoleDelete: (roleId: string) => void;
  onPermissionCreate: (permission: Omit<Permission, 'id'>) => void;
  onPermissionUpdate: (permissionId: string, updates: Partial<Permission>) => void;
  onPermissionDelete: (permissionId: string) => void;
}

export function UserManagement({
  supabaseUrl,
  supabaseKey,
  onUserCreate,
  onUserUpdate,
  onUserDelete,
  onRoleCreate,
  onRoleUpdate,
  onRoleDelete,
  onPermissionCreate,
  onPermissionUpdate,
  onPermissionDelete,
}: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isCreatingPermission, setIsCreatingPermission] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({});
  const [newRole, setNewRole] = useState<Partial<Role>>({});
  const [newPermission, setNewPermission] = useState<Partial<Permission>>({});
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const supabase = createClient(supabaseUrl, supabaseKey);

  // יצירת מדיניות RLS
  const createRLSPolicies = async () => {
    // מדיניות לטבלת משתמשים
    await supabase.rpc('create_rls_policy', {
      table_name: 'users',
      policy_name: 'users_policy',
      using_expression: 'auth.uid() = id OR auth.role() = \'admin\'',
      check_expression: 'auth.role() = \'admin\'',
    });

    // מדיניות לטבלת תפקידים
    await supabase.rpc('create_rls_policy', {
      table_name: 'roles',
      policy_name: 'roles_policy',
      using_expression: 'auth.role() = \'admin\'',
      check_expression: 'auth.role() = \'admin\'',
    });

    // מדיניות לטבלת הרשאות
    await supabase.rpc('create_rls_policy', {
      table_name: 'permissions',
      policy_name: 'permissions_policy',
      using_expression: 'auth.role() = \'admin\'',
      check_expression: 'auth.role() = \'admin\'',
    });
  };

  // יצירת משתמש חדש
  const createUser = async () => {
    if (!newUser.email || !newUser.role) return;

    // יצירת משתמש בשירות האימות
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: newUser.email,
      password: generateSecurePassword(), // יצירת סיסמה ראשונית
      options: {
        data: {
          role: newUser.role,
        },
      },
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return;
    }

    // יצירת רשומת משתמש בטבלה
    const user: Omit<User, 'id' | 'createdAt'> = {
      email: newUser.email,
      role: newUser.role,
      permissions: [],
      isActive: true,
    };

    onUserCreate(user);
    setNewUser({});
    setIsCreatingUser(false);
  };

  // עדכון הרשאות משתמש
  const updateUserPermissions = (userId: string, permissions: string[]) => {
    onUserUpdate(userId, { permissions: permissions.map(id => 
      this.permissions.find(p => p.id === id)!
    )});
  };

  // יצירת תפקיד חדש
  const createRole = () => {
    if (!newRole.name) return;

    onRoleCreate({
      name: newRole.name,
      description: newRole.description || '',
      permissions: newRole.permissions || [],
    });

    setNewRole({});
    setIsCreatingRole(false);
  };

  // יצירת הרשאה חדשה
  const createPermission = () => {
    if (!newPermission.name || !newPermission.resource) return;

    onPermissionCreate({
      name: newPermission.name,
      description: newPermission.description || '',
      resource: newPermission.resource,
      actions: newPermission.actions || ['read'],
    });

    setNewPermission({});
    setIsCreatingPermission(false);
  };

  // בדיקת הרשאות
  const checkPermission = (userId: string, resource: string, action: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return false;

    // בדיקת הרשאות ישירות
    if (user.permissions.some(p => 
      p.resource === resource && p.actions.includes(action as any)
    )) {
      return true;
    }

    // בדיקת הרשאות דרך תפקיד
    const role = roles.find(r => r.name === user.role);
    if (!role) return false;

    return role.permissions.some(permissionId => {
      const permission = permissions.find(p => p.id === permissionId);
      return permission?.resource === resource && permission?.actions.includes(action as any);
    });
  };

  // יצירת סיסמה מאובטחת
  const generateSecurePassword = () => {
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ניהול משתמשים והרשאות</h2>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCreatingUser(true)}>
            <UserPlus className="ml-2 h-4 w-4" />
            משתמש חדש
          </Button>

          <Button variant="outline" onClick={() => setIsCreatingRole(true)}>
            <Shield className="ml-2 h-4 w-4" />
            תפקיד חדש
          </Button>

          <Button variant="outline" onClick={() => setIsCreatingPermission(true)}>
            <Key className="ml-2 h-4 w-4" />
            הרשאה חדשה
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">משתמשים</h3>
          {users.map(user => (
            <div
              key={user.id}
              className="p-4 border rounded space-y-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{user.email}</div>
                  <div className="text-sm text-gray-500">
                    תפקיד: {user.role}
                    {user.lastLogin && ` · התחברות אחרונה: ${new Date(user.lastLogin).toLocaleDateString()}`}
                  </div>
                </div>
                <Badge variant={user.isActive ? 'default' : 'secondary'}>
                  {user.isActive ? 'פעיל' : 'לא פעיל'}
                </Badge>
              </div>

              <div className="flex gap-1">
                {user.permissions.map(permission => (
                  <Badge key={permission.id} variant="outline">
                    {permission.name}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(user.id)}
                >
                  <Settings className="ml-2 h-4 w-4" />
                  הגדרות
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUserDelete(user.id)}
                >
                  <Lock className="ml-2 h-4 w-4" />
                  חסום
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">תפקידים והרשאות</h3>
          {roles.map(role => (
            <div
              key={role.id}
              className="p-4 border rounded space-y-2"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{role.name}</div>
                  <div className="text-sm text-gray-500">{role.description}</div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRole(role.id)}
                >
                  <Settings className="ml-2 h-4 w-4" />
                  ערוך
                </Button>
              </div>

              <div className="flex gap-1">
                {role.permissions.map(permissionId => {
                  const permission = permissions.find(p => p.id === permissionId);
                  return permission ? (
                    <Badge key={permission.id} variant="outline">
                      {permission.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isCreatingUser} onOpenChange={setIsCreatingUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>יצירת משתמש חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">כתובת דוא"ל</label>
              <Input
                type="email"
                value={newUser.email || ''}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="הזן כתובת דוא"ל..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">תפקיד</label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value as User['role'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר תפקיד" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">מנהל מערכת</SelectItem>
                  <SelectItem value="manager">מנהל</SelectItem>
                  <SelectItem value="user">משתמש</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreatingUser(false)}>
                ביטול
              </Button>
              <Button onClick={createUser}>
                צור משתמש
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreatingRole} onOpenChange={setIsCreatingRole}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>יצירת תפקיד חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">שם התפקיד</label>
              <Input
                value={newRole.name || ''}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder="הזן שם לתפקיד..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">תיאור</label>
              <Input
                value={newRole.description || ''}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder="הזן תיאור..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">הרשאות</label>
              <Select
                value={newRole.permissions?.[0]}
                onValueChange={(value) => setNewRole({
                  ...newRole,
                  permissions: [...(newRole.permissions || []), value],
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר הרשאות" />
                </SelectTrigger>
                <SelectContent>
                  {permissions.map(permission => (
                    <SelectItem key={permission.id} value={permission.id}>
                      {permission.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1 mt-2">
                {newRole.permissions?.map(permissionId => {
                  const permission = permissions.find(p => p.id === permissionId);
                  return permission ? (
                    <Badge
                      key={permission.id}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setNewRole({
                        ...newRole,
                        permissions: newRole.permissions?.filter(id => id !== permissionId),
                      })}
                    >
                      {permission.name}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreatingRole(false)}>
                ביטול
              </Button>
              <Button onClick={createRole}>
                צור תפקיד
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreatingPermission} onOpenChange={setIsCreatingPermission}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>יצירת הרשאה חדשה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">שם ההרשאה</label>
              <Input
                value={newPermission.name || ''}
                onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
                placeholder="הזן שם להרשאה..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">תיאור</label>
              <Input
                value={newPermission.description || ''}
                onChange={(e) => setNewPermission({ ...newPermission, description: e.target.value })}
                placeholder="הזן תיאור..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">משאב</label>
              <Input
                value={newPermission.resource || ''}
                onChange={(e) => setNewPermission({ ...newPermission, resource: e.target.value })}
                placeholder="הזן שם משאב..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">פעולות</label>
              <div className="flex gap-2">
                {['create', 'read', 'update', 'delete'].map(action => (
                  <Button
                    key={action}
                    variant={newPermission.actions?.includes(action as any) ? 'default' : 'outline'}
                    onClick={() => {
                      const actions = new Set(newPermission.actions || []);
                      if (actions.has(action as any)) {
                        actions.delete(action as any);
                      } else {
                        actions.add(action as any);
                      }
                      setNewPermission({
                        ...newPermission,
                        actions: Array.from(actions) as Permission['actions'],
                      });
                    }}
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsCreatingPermission(false)}>
                ביטול
              </Button>
              <Button onClick={createPermission}>
                צור הרשאה
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הגדרות משתמש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedUser && (
              <>
                <div>
                  <label className="text-sm font-medium">תפקיד</label>
                  <Select
                    value={users.find(u => u.id === selectedUser)?.role}
                    onValueChange={(value) => onUserUpdate(selectedUser, { role: value as User['role'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">מנהל מערכת</SelectItem>
                      <SelectItem value="manager">מנהל</SelectItem>
                      <SelectItem value="user">משתמש</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">הרשאות</label>
                  <div className="space-y-2">
                    {permissions.map(permission => {
                      const isGranted = users
                        .find(u => u.id === selectedUser)
                        ?.permissions
                        .some(p => p.id === permission.id);

                      return (
                        <div
                          key={permission.id}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div>
                            <div className="font-medium">{permission.name}</div>
                            <div className="text-sm text-gray-500">{permission.description}</div>
                          </div>
                          <Button
                            variant={isGranted ? 'default' : 'outline'}
                            onClick={() => {
                              const user = users.find(u => u.id === selectedUser)!;
                              const newPermissions = isGranted
                                ? user.permissions.filter(p => p.id !== permission.id)
                                : [...user.permissions, permission];
                              onUserUpdate(selectedUser, { permissions: newPermissions });
                            }}
                          >
                            {isGranted ? 'הסר' : 'הענק'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedRole} onOpenChange={() => setSelectedRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עריכת תפקיד</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRole && (
              <>
                <div>
                  <label className="text-sm font-medium">שם התפקיד</label>
                  <Input
                    value={roles.find(r => r.id === selectedRole)?.name || ''}
                    onChange={(e) => onRoleUpdate(selectedRole, { name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">תיאור</label>
                  <Input
                    value={roles.find(r => r.id === selectedRole)?.description || ''}
                    onChange={(e) => onRoleUpdate(selectedRole, { description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">הרשאות</label>
                  <div className="space-y-2">
                    {permissions.map(permission => {
                      const isGranted = roles
                        .find(r => r.id === selectedRole)
                        ?.permissions
                        .includes(permission.id);

                      return (
                        <div
                          key={permission.id}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div>
                            <div className="font-medium">{permission.name}</div>
                            <div className="text-sm text-gray-500">{permission.description}</div>
                          </div>
                          <Button
                            variant={isGranted ? 'default' : 'outline'}
                            onClick={() => {
                              const role = roles.find(r => r.id === selectedRole)!;
                              const newPermissions = isGranted
                                ? role.permissions.filter(id => id !== permission.id)
                                : [...role.permissions, permission.id];
                              onRoleUpdate(selectedRole, { permissions: newPermissions });
                            }}
                          >
                            {isGranted ? 'הסר' : 'הוסף'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 