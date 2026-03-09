"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, Save } from "lucide-react";
import { AdminRouteGuard } from "@/components/guards/admin-route-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  rolesService,
  type RoleItem,
  type RoleWithPermissions,
  type PermissionItem,
} from "@/services/roles.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function RolesContent() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());

  const loadRoles = useCallback(() => {
    rolesService.getRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  const loadPermissions = useCallback(() => {
    rolesService.getPermissions().then(setPermissions).catch(() => setPermissions([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([rolesService.getRoles(), rolesService.getPermissions()])
      .then(([r, p]) => {
        setRoles(r);
        setPermissions(p);
        if (r.length > 0) {
          return rolesService.getRoleById(r[0].id).then((role) => {
            setSelectedRole(role);
            setSelectedPermIds(
              new Set(role.rolePermissions?.map((rp) => rp.permissionId) ?? [])
            );
          });
        }
      })
      .catch(() => {
        toast.error("Failed to load roles/permissions");
      })
      .finally(() => setLoading(false));
  }, []);

  const onSelectRole = useCallback((roleId: string) => {
    if (!roleId) {
      setSelectedRole(null);
      setSelectedPermIds(new Set());
      return;
    }
    setRoleLoading(true);
    rolesService
      .getRoleById(roleId)
      .then((role) => {
        setSelectedRole(role);
        setSelectedPermIds(new Set(role.rolePermissions?.map((rp) => rp.permissionId) ?? []));
      })
      .catch(() => toast.error("Failed to load role"))
      .finally(() => setRoleLoading(false));
  }, []);

  const togglePermission = useCallback((permId: string) => {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  }, []);

  const savePermissions = useCallback(async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await rolesService.updatePermissions(selectedRole.id, Array.from(selectedPermIds));
      toast.success("Permissions saved");
      const updated = await rolesService.getRoleById(selectedRole.id);
      setSelectedRole(updated);
      setSelectedPermIds(new Set(updated.rolePermissions?.map((rp) => rp.permissionId) ?? []));
    } catch {
      toast.error("Failed to save permissions");
    } finally {
      setSaving(false);
    }
  }, [selectedRole, selectedPermIds]);

  const byResource = permissions.reduce<Record<string, PermissionItem[]>>((acc, p) => {
    const r = p.resource || "Other";
    if (!acc[r]) acc[r] = [];
    acc[r].push(p);
    return acc;
  }, {});

  const resourceOrder = Object.keys(byResource).sort();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
        <p className="text-muted-foreground mt-1">View and edit role permissions (Admin only)</p>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Permission matrix</CardTitle>
              <CardDescription>Select a role and toggle permissions, then save.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Role</Label>
              <Select
                value={selectedRole?.id ?? ""}
                onChange={(e) => onSelectRole(e.target.value)}
                className="w-[180px] rounded-2xl"
              >
                <option value="">Select role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : roleLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : !selectedRole ? (
            <div className="py-12 text-center text-muted-foreground">
              Select a role to edit permissions
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{selectedRole.name}</p>
                  {selectedRole.description && (
                    <p className="text-muted-foreground text-sm">{selectedRole.description}</p>
                  )}
                </div>
                <Button
                  className="rounded-xl"
                  onClick={savePermissions}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}
                  Save changes
                </Button>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-border/60">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 font-medium text-muted-foreground">Resource</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Permission</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">Granted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resourceOrder.map((resource) =>
                      (byResource[resource] ?? []).map((perm) => (
                        <tr
                          key={perm.id}
                          className="border-b border-border/60 transition-colors hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 font-medium">{resource}</td>
                          <td className="px-4 py-3">
                            <span className="text-muted-foreground">{perm.action}</span>
                            {perm.description && (
                              <p className="text-muted-foreground text-xs">{perm.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => togglePermission(perm.id)}
                              className={cn(
                                "rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors",
                                selectedPermIds.has(perm.id)
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                              )}
                            >
                              {selectedPermIds.has(perm.id) ? "Yes" : "No"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {permissions.length === 0 && (
                <p className="py-8 text-center text-muted-foreground">No permissions defined</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function RolesPage() {
  return (
    <AdminRouteGuard>
      <RolesContent />
    </AdminRouteGuard>
  );
}
