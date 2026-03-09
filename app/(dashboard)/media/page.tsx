"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Copy,
  Image as ImageIcon,
  Upload,
  X,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { mediaService, type MediaItem } from "@/services/media.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const folderOptions = ["cms", "banners", "products", "general"];
const FOLDER_ALL = "all";
const TYPE_ALL = "all";
const TYPE_IMAGES = "image";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export default function MediaPage() {
  const [data, setData] = useState<{ data: MediaItem[]; meta: { total: number; page: number; limit: number; totalPages: number; hasNext: boolean; hasPrev: boolean } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [folderFilter, setFolderFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>(TYPE_ALL);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [editForm, setEditForm] = useState({ alt: "", originalName: "", folder: "" });
  const [uploading, setUploading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadFolder, setUploadFolder] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    mediaService
      .getList({
        page: page + 1,
        limit: 20,
        ...(folderFilter && folderFilter !== FOLDER_ALL && { folder: folderFilter }),
        ...(typeFilter === TYPE_IMAGES && { mimeType: "image" }),
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
      })
      .then(setData)
      .catch((e) => {
        toast.error(e?.response?.data?.message ?? "Failed to load media");
        setData({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0, hasNext: false, hasPrev: false } });
      })
      .finally(() => setLoading(false));
  }, [page, folderFilter, typeFilter, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const openUpload = () => {
    setUploadFiles([]);
    setUploadAlt("");
    setUploadFolder("");
    setUploadDialogOpen(true);
  };

  const openEdit = (item: MediaItem) => {
    setEditingItem(item);
    setEditForm({
      alt: item.alt ?? "",
      originalName: item.originalName,
      folder: item.folder ?? "",
    });
    setEditDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const valid: File[] = [];
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name}: file too large (max 10MB)`);
        continue;
      }
      if (!ALLOWED_TYPES.some((t) => f.type === t || (t === "image/*" && f.type.startsWith("image/")))) {
        toast.error(`${f.name}: type not allowed (images and PDF only)`);
        continue;
      }
      valid.push(f);
    }
    setUploadFiles((prev) => [...prev, ...valid]);
    e.target.value = "";
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async () => {
    if (uploadFiles.length === 0) {
      toast.error("Select at least one file");
      return;
    }
    setUploading(true);
    let ok = 0;
    for (const file of uploadFiles) {
      try {
        await mediaService.upload(file, { alt: uploadAlt || undefined, folder: uploadFolder || undefined });
        ok++;
      } catch (e) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setUploading(false);
    if (ok > 0) {
      toast.success(`Uploaded ${ok} file(s)`);
      setUploadDialogOpen(false);
      setUploadFiles([]);
      load();
    }
  };

  const handleEditSubmit = async () => {
    if (!editingItem) return;
    try {
      await mediaService.update(editingItem.id, {
        alt: editForm.alt || undefined,
        originalName: editForm.originalName || editingItem.originalName,
        folder: editForm.folder || undefined,
      });
      toast.success("Media updated");
      setEditDialogOpen(false);
      setEditingItem(null);
      load();
    } catch (e) {
      toast.error("Failed to update");
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await mediaService.delete(deleteId);
      toast.success("Media deleted");
      setDeleteId(null);
      load();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const copyUrl = (item: MediaItem) => {
    navigator.clipboard.writeText(item.url);
    toast.success("URL copied");
  };

  const items = data?.data ?? [];
  const meta = data?.meta;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
        <p className="text-muted-foreground mt-1">
          Upload and manage images and files for CMS, banners, and products
        </p>
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Media library</CardTitle>
            <CardDescription>Upload, edit metadata, and copy URLs</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search name or alt..."
                className="pl-9 w-[200px] rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={folderFilter || FOLDER_ALL}
              onChange={(e) => setFolderFilter(e.target.value === FOLDER_ALL ? "" : e.target.value)}
              className="w-[130px] rounded-xl"
            >
              <option value={FOLDER_ALL}>All folders</option>
              {folderOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </Select>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-[120px] rounded-xl"
            >
              <option value={TYPE_ALL}>All types</option>
              <option value={TYPE_IMAGES}>Images</option>
            </Select>
            <Button className="rounded-xl" onClick={openUpload}>
              <Plus className="size-4 mr-2" />
              Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground rounded-2xl border border-dashed border-border/60">
              <ImageIcon className="size-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No media yet</p>
              <p className="text-sm mt-1">Upload images or PDFs for CMS, banners, and more.</p>
              <Button className="mt-4 rounded-xl" onClick={openUpload}>
                <Upload className="size-4 mr-2" />
                Upload files
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-xl border border-border/60 overflow-hidden bg-muted/20 hover:border-border transition-colors"
                  >
                    <div className="aspect-square relative bg-muted/40">
                      {isImage(item.mimeType) ? (
                        <img
                          src={item.url}
                          alt={item.alt ?? item.originalName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <span className="text-xs font-mono">PDF</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button variant="secondary" size="sm" className="rounded-lg" onClick={() => openEdit(item)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="secondary" size="sm" className="rounded-lg" onClick={() => copyUrl(item)}>
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-lg text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate" title={item.originalName}>{item.originalName}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(item.size)}</p>
                      {item.folder && (
                        <Badge variant="secondary" className="mt-1 text-[10px]">{item.folder}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-2 py-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {(meta?.page ?? 1)} of {meta?.totalPages || 1} · {meta?.total ?? 0} total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={!meta?.hasPrev}
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!meta?.hasNext}
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

      {/* Upload dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Upload media</DialogTitle>
            <DialogDescription>Select one or more files (images or PDF, max 10MB each)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center transition-colors",
                "border-border/60 hover:border-primary/50 bg-muted/20"
              )}
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                className="hidden"
                id="media-upload-input"
                onChange={handleFileChange}
              />
              <label htmlFor="media-upload-input" className="cursor-pointer block">
                <Upload className="size-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Click or drag files here</p>
                <p className="text-xs text-muted-foreground mt-1">Images and PDF, max 10MB</p>
              </label>
            </div>
            {uploadFiles.length > 0 && (
              <ul className="space-y-2 max-h-32 overflow-y-auto">
                {uploadFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate">{f.name}</span>
                    <Button variant="ghost" size="sm" className="shrink-0" onClick={() => removeUploadFile(i)}>
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <div>
              <Label htmlFor="upload-alt">Alt text (optional)</Label>
              <Input
                id="upload-alt"
                className="rounded-xl mt-1"
                value={uploadAlt}
                onChange={(e) => setUploadAlt(e.target.value)}
                placeholder="Description for accessibility"
              />
            </div>
            <div>
              <Label htmlFor="upload-folder">Folder (optional)</Label>
              <Select
                id="upload-folder"
                className="rounded-xl mt-1 w-full"
                value={uploadFolder || "none"}
                onChange={(e) => setUploadFolder(e.target.value === "none" ? "" : e.target.value)}
              >
                <option value="none">None</option>
                {folderOptions.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={handleUploadSubmit} disabled={uploading || uploadFiles.length === 0}>
              {uploading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Upload {uploadFiles.length > 0 ? `(${uploadFiles.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit media</DialogTitle>
            <DialogDescription>Update alt text, display name, and folder</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-originalName">Display name</Label>
                <Input
                  id="edit-originalName"
                  className="rounded-xl mt-1"
                  value={editForm.originalName}
                  onChange={(e) => setEditForm((f) => ({ ...f, originalName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-alt">Alt text</Label>
                <Input
                  id="edit-alt"
                  className="rounded-xl mt-1"
                  value={editForm.alt}
                  onChange={(e) => setEditForm((f) => ({ ...f, alt: e.target.value }))}
                  placeholder="Accessibility description"
                />
              </div>
              <div>
                <Label htmlFor="edit-folder">Folder</Label>
                <Select
                  id="edit-folder"
                  className="rounded-xl mt-1 w-full"
                  value={editForm.folder || "none"}
                  onChange={(e) => setEditForm((f) => ({ ...f, folder: e.target.value === "none" ? "" : e.target.value }))}
                >
                  <option value="none">None</option>
                  {folderOptions.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-xl" onClick={handleEditSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete media?</DialogTitle>
            <DialogDescription>This will remove the file and its record. Content using this URL may break.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
