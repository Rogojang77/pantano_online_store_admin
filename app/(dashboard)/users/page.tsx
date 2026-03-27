"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { motion } from "framer-motion";
import { Plus, Pencil, KeyRound, ChevronLeft, ChevronRight, Search, Eye, EyeOff } from "lucide-react";
import { AdminRouteGuard } from "@/components/guards/admin-route-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import {
  usersService,
  type UserListItem,
  type CreateUserPayload,
  type UpdateUserPayload,
} from "@/services/users.service";
import { rolesService, type RoleItem } from "@/services/roles.service";
import type { PaginatedResponse } from "@/types/api";
import { toast } from "sonner";
import { ListFetchError } from "@/components/list-fetch-error";

const createUserSchema = z
  .object({
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "At least 8 characters"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    accountType: z.enum(["INDIVIDUAL", "COMPANY"]).default("INDIVIDUAL"),
    companyName: z.string().optional(),
    companyVatId: z.string().optional(),
    companyTradeRegister: z.string().optional(),
    roleId: z.string().min(1, "Select a role"),
    isActive: z.boolean().optional(),
  })
  .required({ email: true, password: true, roleId: true })
  .superRefine((data, ctx) => {
    if (data.accountType === "COMPANY") {
      if (!data.companyName?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["companyName"], message: "Company name is required" });
      }
      if (!data.companyVatId?.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["companyVatId"], message: "VAT/CUI is required" });
      }
    }
  });

const editUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  accountType: z.enum(["INDIVIDUAL", "COMPANY"]).default("INDIVIDUAL"),
  companyName: z.string().optional(),
  companyVatId: z.string().optional(),
  companyTradeRegister: z.string().optional(),
  roleId: z.string().min(1, "Select a role"),
  isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.accountType === "COMPANY") {
    if (!data.companyName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["companyName"], message: "Company name is required" });
    }
    if (!data.companyVatId?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["companyVatId"], message: "VAT/CUI is required" });
    }
  }
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "At least 8 characters"),
});

type CreateUserForm = z.input<typeof createUserSchema>;
type EditUserForm = z.input<typeof editUserSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

function UsersContent() {
  const [data, setData] = useState<PaginatedResponse<UserListItem> | null>(null);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(0);
  const [limit] = useState(10);
  const [searchInput, setSearchInput] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [selected, setSelected] = useState<UserListItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchDebounced(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [searchDebounced]);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    usersService
      .getList({ page: page + 1, limit, ...(searchDebounced && { search: searchDebounced }) })
      .then((response) => {
        setData(response);
        setLoadError(false);
      })
      .catch(() => {
        setData(null);
        setLoadError(true);
        toast.error("Failed to load users");
      })
      .finally(() => setLoading(false));
  }, [page, limit, searchDebounced]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    rolesService.getRoles().then(setRoles).catch(() => setRoles([]));
  }, []);

  const createForm = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      accountType: "INDIVIDUAL",
      companyName: "",
      companyVatId: "",
      companyTradeRegister: "",
      roleId: "",
      isActive: true,
    },
  });

  const editForm = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      accountType: "INDIVIDUAL",
      companyName: "",
      companyVatId: "",
      companyTradeRegister: "",
      roleId: "",
      isActive: true,
    },
  });

  const resetForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "" },
  });

  const openEdit = (user: UserListItem) => {
    setSelected(user);
    editForm.reset({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      phone: user.phone ?? "",
      accountType: user.accountType ?? "INDIVIDUAL",
      companyName: user.companyName ?? "",
      companyVatId: user.companyVatId ?? "",
      companyTradeRegister: user.companyTradeRegister ?? "",
      roleId: user.roleId,
      isActive: user.isActive,
    });
    setEditOpen(true);
  };

  const openReset = (user: UserListItem) => {
    setSelected(user);
    resetForm.reset({ newPassword: "" });
    setShowResetPassword(false);
    setResetOpen(true);
  };

  const handleCreate = async (payload: CreateUserForm) => {
    setSubmitting(true);
    try {
      const createPayload: CreateUserPayload = {
        accountType: payload.accountType ?? "INDIVIDUAL",
        email: payload.email,
        password: payload.password,
        firstName: payload.firstName || undefined,
        lastName: payload.lastName || undefined,
        phone: payload.phone || undefined,
        companyName: payload.accountType === "COMPANY" ? payload.companyName || undefined : undefined,
        companyVatId: payload.accountType === "COMPANY" ? payload.companyVatId || undefined : undefined,
        companyTradeRegister: payload.accountType === "COMPANY" ? payload.companyTradeRegister || undefined : undefined,
        roleId: payload.roleId,
        isActive: payload.isActive ?? true,
      };
      await usersService.create(createPayload);
      toast.success("User created");
      setCreateOpen(false);
      setShowCreatePassword(false);
      createForm.reset();
      fetchUsers();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Create failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (payload: EditUserForm) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const updatePayload: UpdateUserPayload = {
        accountType: payload.accountType ?? "INDIVIDUAL",
        firstName: payload.firstName || undefined,
        lastName: payload.lastName || undefined,
        phone: payload.phone || undefined,
        companyName: payload.accountType === "COMPANY" ? payload.companyName || undefined : undefined,
        companyVatId: payload.accountType === "COMPANY" ? payload.companyVatId || undefined : undefined,
        companyTradeRegister: payload.accountType === "COMPANY" ? payload.companyTradeRegister || undefined : undefined,
        roleId: payload.roleId,
        isActive: payload.isActive,
      };
      await usersService.update(selected.id, updatePayload);
      toast.success("User updated");
      setEditOpen(false);
      setSelected(null);
      fetchUsers();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Update failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (payload: ResetPasswordForm) => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await usersService.resetPassword(selected.id, payload.newPassword);
      toast.success("Password reset");
      setResetOpen(false);
      setSelected(null);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Reset failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnDef<UserListItem>[] = [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => <span className="font-medium">{getValue() as string}</span>,
    },
    {
      id: "name",
      header: "Name",
      cell: ({ row }) =>
        [row.original.firstName, row.original.lastName].filter(Boolean).join(" ") || "—",
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ getValue }) => <span className="text-muted-foreground">{(getValue() as string) || "—"}</span>,
    },
    {
      id: "accountType",
      header: "Account",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.accountType === "COMPANY" ? "Company" : "Individual"}
        </span>
      ),
    },
    {
      id: "companyVatId",
      header: "CUI",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.companyVatId || "—"}</span>,
    },
    {
      id: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.role?.name ?? row.original.role?.slug ?? "—"}</Badge>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ getValue }) => (
        <Badge variant={(getValue() as boolean) ? "success" : "secondary"}>
          {(getValue() as boolean) ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-xl"
            onClick={() => openEdit(row.original)}
            aria-label="Edit"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-xl"
            onClick={() => openReset(row.original)}
            aria-label="Reset password"
          >
            <KeyRound className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: data?.meta?.totalPages ?? 0,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage users and access (Admin only)</p>
        </div>
        <Button className="rounded-2xl shrink-0" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-2" />
          Add user
        </Button>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All users</CardTitle>
              <CardDescription>Search and manage users</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="rounded-2xl pl-9"
              />
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
          ) : loadError ? (
            <ListFetchError message="Could not load users." onRetry={fetchUsers} />
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-border/60">
                <table className="w-full text-left text-sm">
                  <thead>
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id} className="border-b border-border bg-muted/40">
                        {hg.headers.map((h) => (
                          <th key={h.id} className="px-4 py-3 font-medium text-muted-foreground">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          className="border-b border-border/60 transition-colors hover:bg-muted/30"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="px-4 py-3">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 px-2 py-4">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {data?.meta?.totalPages || 1} · {data?.meta?.total ?? 0} total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={!data?.meta?.hasPrev}
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!data?.meta?.hasNext}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create user dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>Create a new user and assign a role.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
            <div>
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                className="mt-1 rounded-2xl"
                {...createForm.register("email")}
              />
              {createForm.formState.errors.email && (
                <p className="text-destructive mt-1 text-sm">{createForm.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="create-password">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="create-password"
                  type={showCreatePassword ? "text" : "password"}
                  className="rounded-2xl pr-10"
                  {...createForm.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={showCreatePassword ? "Hide password" : "Show password"}
                >
                  {showCreatePassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {createForm.formState.errors.password && (
                <p className="text-destructive mt-1 text-sm">{createForm.formState.errors.password.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="create-firstName">First name</Label>
                <Input id="create-firstName" className="mt-1 rounded-2xl" {...createForm.register("firstName")} />
              </div>
              <div>
                <Label htmlFor="create-lastName">Last name</Label>
                <Input id="create-lastName" className="mt-1 rounded-2xl" {...createForm.register("lastName")} />
              </div>
            </div>
            <div>
              <Label htmlFor="create-phone">Phone</Label>
              <Input id="create-phone" className="mt-1 rounded-2xl" {...createForm.register("phone")} />
            </div>
            <div>
              <Label htmlFor="create-accountType">Account type</Label>
              <Select
                id="create-accountType"
                className="mt-1"
                value={createForm.watch("accountType") ?? "INDIVIDUAL"}
                onChange={(e) => createForm.setValue("accountType", e.target.value as "INDIVIDUAL" | "COMPANY")}
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="COMPANY">Company</option>
              </Select>
            </div>
            {(createForm.watch("accountType") ?? "INDIVIDUAL") === "COMPANY" && (
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <Label htmlFor="create-companyName">Company name</Label>
                  <Input id="create-companyName" className="mt-1 rounded-2xl" {...createForm.register("companyName")} />
                  {createForm.formState.errors.companyName && (
                    <p className="text-destructive mt-1 text-sm">{createForm.formState.errors.companyName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="create-companyVatId">CUI / VAT</Label>
                  <Input id="create-companyVatId" className="mt-1 rounded-2xl" {...createForm.register("companyVatId")} />
                  {createForm.formState.errors.companyVatId && (
                    <p className="text-destructive mt-1 text-sm">{createForm.formState.errors.companyVatId.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="create-companyTradeRegister">Trade register</Label>
                  <Input
                    id="create-companyTradeRegister"
                    className="mt-1 rounded-2xl"
                    {...createForm.register("companyTradeRegister")}
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="create-roleId">Role</Label>
              <Select
                id="create-roleId"
                className="mt-1"
                value={createForm.watch("roleId")}
                onChange={(e) => createForm.setValue("roleId", e.target.value)}
              >
                <option value="">Select role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
              {createForm.formState.errors.roleId && (
                <p className="text-destructive mt-1 text-sm">{createForm.formState.errors.roleId.message}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="create-active"
                className="rounded border-border"
                {...createForm.register("isActive")}
              />
              <Label htmlFor="create-active">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl" disabled={submitting}>
                {submitting ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>{selected?.email}</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="edit-firstName">First name</Label>
                <Input id="edit-firstName" className="mt-1 rounded-2xl" {...editForm.register("firstName")} />
              </div>
              <div>
                <Label htmlFor="edit-lastName">Last name</Label>
                <Input id="edit-lastName" className="mt-1 rounded-2xl" {...editForm.register("lastName")} />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" className="mt-1 rounded-2xl" {...editForm.register("phone")} />
            </div>
            <div>
              <Label htmlFor="edit-accountType">Account type</Label>
              <Select
                id="edit-accountType"
                className="mt-1"
                value={editForm.watch("accountType") ?? "INDIVIDUAL"}
                onChange={(e) => editForm.setValue("accountType", e.target.value as "INDIVIDUAL" | "COMPANY")}
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="COMPANY">Company</option>
              </Select>
            </div>
            {(editForm.watch("accountType") ?? "INDIVIDUAL") === "COMPANY" && (
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <Label htmlFor="edit-companyName">Company name</Label>
                  <Input id="edit-companyName" className="mt-1 rounded-2xl" {...editForm.register("companyName")} />
                  {editForm.formState.errors.companyName && (
                    <p className="text-destructive mt-1 text-sm">{editForm.formState.errors.companyName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="edit-companyVatId">CUI / VAT</Label>
                  <Input id="edit-companyVatId" className="mt-1 rounded-2xl" {...editForm.register("companyVatId")} />
                  {editForm.formState.errors.companyVatId && (
                    <p className="text-destructive mt-1 text-sm">{editForm.formState.errors.companyVatId.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="edit-companyTradeRegister">Trade register</Label>
                  <Input
                    id="edit-companyTradeRegister"
                    className="mt-1 rounded-2xl"
                    {...editForm.register("companyTradeRegister")}
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="edit-roleId">Role</Label>
              <Select
                id="edit-roleId"
                className="mt-1"
                value={editForm.watch("roleId")}
                onChange={(e) => editForm.setValue("roleId", e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-active"
                className="rounded border-border"
                {...editForm.register("isActive")}
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Set a new password for {selected?.email}</DialogDescription>
          </DialogHeader>
          <form onSubmit={resetForm.handleSubmit(handleResetPassword)} className="space-y-4">
            <div>
              <Label htmlFor="reset-newPassword">New password</Label>
              <div className="relative mt-1">
                <Input
                  id="reset-newPassword"
                  type={showResetPassword ? "text" : "password"}
                  className="rounded-2xl pr-10"
                  {...resetForm.register("newPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={showResetPassword ? "Hide password" : "Show password"}
                >
                  {showResetPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {resetForm.formState.errors.newPassword && (
                <p className="text-destructive mt-1 text-sm">{resetForm.formState.errors.newPassword.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl" disabled={submitting}>
                {submitting ? "Resetting..." : "Reset"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export default function UsersPage() {
  return (
    <AdminRouteGuard>
      <UsersContent />
    </AdminRouteGuard>
  );
}
