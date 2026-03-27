"use client";

import { useState, useEffect, useCallback } from "react";
import { Image as ImageIcon, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { mediaService, type MediaItem } from "@/services/media.service";
import { cn } from "@/lib/utils";

export interface MediaPickerProps {
  value: string;
  onChange: (url: string, alt?: string) => void;
  placeholder?: string;
  className?: string;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function MediaPicker({ value, onChange, placeholder = "Image URL", className }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    mediaService
      .getList({
        page: page + 1,
        limit: 12,
        mimeType: "image",
        ...(search.trim() && { search: search.trim() }),
        ...(folderFilter && { folder: folderFilter }),
      })
      .then((res) => {
        setItems(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [page, search, folderFilter]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleSelect = (item: MediaItem) => {
    onChange(item.url, item.alt ?? undefined);
    setOpen(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <Input
          className="rounded-xl flex-1"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          className="rounded-xl shrink-0"
          onClick={() => setOpen(true)}
        >
          Choose from library
        </Button>
      </div>
      {value && (
        <div className="rounded-xl border border-border/60 overflow-hidden w-20 h-20 bg-muted/30">
          <img
            src={value}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col rounded-2xl">
          <DialogHeader>
            <DialogTitle>Choose image</DialogTitle>
            <DialogDescription>Select an image from the media library</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-9 rounded-xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm w-28"
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
              >
                <option value="">All folders</option>
                <option value="cms">cms</option>
                <option value="banners">banners</option>
                <option value="products">products</option>
                <option value="general">general</option>
              </select>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground text-sm">No images found. Upload some in Media.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 overflow-y-auto max-h-[320px]">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="aspect-square rounded-xl border border-border/60 overflow-hidden bg-muted/20 hover:border-primary/50 hover:ring-2 hover:ring-primary/20 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
                      onClick={() => handleSelect(item)}
                    >
                      {isImage(item.mimeType) ? (
                        <img
                          src={item.url}
                          alt={item.alt ?? item.originalName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          <ImageIcon className="size-8" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2">
                  <p className="text-xs text-muted-foreground">
                    Page {page + 1} of {totalPages || 1}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
