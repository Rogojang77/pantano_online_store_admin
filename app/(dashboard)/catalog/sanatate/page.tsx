"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  adminService,
  type CatalogHealth,
  type CatalogIssueItem,
  type CatalogIssueType,
} from "@/services/admin.service";
import { notifyApiError } from "@/lib/notify-api-error";

type IssueTab = {
  type: CatalogIssueType;
  label: string;
  healthKey: keyof CatalogHealth;
};

const ISSUE_TABS: IssueTab[] = [
  { type: "missing_primary_image", label: "Fără imagine principală", healthKey: "missingPrimaryImage" },
  { type: "short_description", label: "Descriere scurtă/lipsă", healthKey: "shortDescription" },
  { type: "missing_ean", label: "Fără EAN", healthKey: "missingEan" },
  { type: "missing_documents", label: "Fără documente", healthKey: "missingDocuments" },
  { type: "low_completeness", label: "Completitudine joasă", healthKey: "lowCompleteness" },
  { type: "duplicate_sku_or_ean", label: "Duplicat SKU/EAN", healthKey: "duplicateSkuOrEan" },
];

export default function CatalogHealthPage() {
  const [health, setHealth] = useState<CatalogHealth | null>(null);
  const [activeType, setActiveType] = useState<CatalogIssueType>("missing_primary_image");
  const [issues, setIssues] = useState<CatalogIssueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const activeTab = useMemo(
    () => ISSUE_TABS.find((tab) => tab.type === activeType) ?? ISSUE_TABS[0],
    [activeType],
  );

  const loadHealth = useCallback(async () => {
    const data = await adminService.getCatalogHealth();
    setHealth(data);
  }, []);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getCatalogIssues(activeType, page, 25);
      setIssues(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [activeType, page]);

  useEffect(() => {
    Promise.all([loadHealth(), loadIssues()]).catch((e) =>
      notifyApiError(e, "Nu am putut încărca raportul de sănătate al catalogului"),
    );
  }, [loadHealth, loadIssues]);

  useEffect(() => {
    loadIssues().catch((e) => notifyApiError(e, "Nu am putut încărca lista de probleme"));
  }, [loadIssues]);

  const downloadCsv = async () => {
    try {
      const blob = await adminService.downloadCatalogIssuesCsv(activeType);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalog-issues-${activeType}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      notifyApiError(e, "Exportul CSV a eșuat");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catalog sănătate</h1>
        <p className="text-muted-foreground mt-1">
          KPI-uri de calitate catalog și listă de produse care necesită acțiuni.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ISSUE_TABS.map((tab) => (
          <Card key={tab.type} className="rounded-2xl border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{tab.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{health ? health[tab.healthKey] : "—"}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Probleme: {activeTab.label}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Total: {total}</p>
          </div>
          <Button variant="outline" onClick={downloadCsv}>
            Export CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {ISSUE_TABS.map((tab) => (
              <Button
                key={tab.type}
                variant={tab.type === activeType ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setActiveType(tab.type);
                  setPage(1);
                }}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Se încarcă...</p>
          ) : issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nu există rezultate pentru acest filtru.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2">Nume</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">EAN</th>
                    <th className="px-3 py-2">Actualizat</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {issues.map((item) => (
                    <tr key={item.id} className="border-t border-border/60">
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">{item.sku ?? "—"}</td>
                      <td className="px-3 py-2">{item.ean ?? "—"}</td>
                      <td className="px-3 py-2">{new Date(item.updatedAt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/products/${item.id}`}
                          className={buttonVariants({ size: "sm", variant: "outline" })}
                        >
                          Deschide produsul
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Pagina {page} · {issues.length} rezultate afișate
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Înapoi
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page * 25 >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Înainte
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
