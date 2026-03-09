"use client";

export interface BlockPreviewFormState {
  type: "HERO" | "BANNER" | "PROMO_GRID";
  bannerTitle?: string;
  bannerBody?: string;
  bannerCtaLabel?: string;
  bannerCtaHref?: string;
  bannerBackgroundColor?: string;
  bannerTextColor?: string;
  bannerBackgroundImageUrl?: string;
  bannerBackgroundImageAlt?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroCtaLabel?: string;
  heroCtaHref?: string;
  heroImageUrl?: string;
  heroImageAlt?: string;
  heroVariant?: "default" | "split" | "full_bleed";
  promoItems?: Array<{ id?: string; title?: string; subtitle?: string; href?: string; imageUrl?: string; imageAlt?: string }>;
  promoColumns?: 2 | 3 | 4 | "2" | "3" | "4";
}

function BannerPreview({ form }: { form: BlockPreviewFormState }) {
  const bg = form.bannerBackgroundColor || "#1a1a1a";
  const textColor = form.bannerTextColor || "#ffffff";
  const hasBgImage = Boolean(form.bannerBackgroundImageUrl?.trim());

  return (
    <div className="rounded-xl border border-border overflow-hidden text-sm">
      <div
        className="relative min-h-[100px] px-4 py-4 flex flex-col items-center gap-2 justify-center text-center"
        style={{ backgroundColor: hasBgImage ? undefined : bg, color: textColor }}
      >
        {hasBgImage && (
          <>
            <div
              className="absolute inset-0 z-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${form.bannerBackgroundImageUrl})` }}
            />
            <div className="absolute inset-0 z-[1]" style={{ backgroundColor: bg, opacity: 0.75 }} />
          </>
        )}
        <div className="relative z-10">
          <p className="font-semibold">{form.bannerTitle || "Banner title"}</p>
          {form.bannerBody && <p className="text-xs opacity-90 mt-0.5">{form.bannerBody}</p>}
          {form.bannerCtaLabel && form.bannerCtaHref && (
            <span className="inline-block mt-2 px-2 py-1 rounded border border-current text-xs">
              {form.bannerCtaLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroPreview({ form }: { form: BlockPreviewFormState }) {
  const isSplit = form.heroVariant === "split";

  return (
    <div className="rounded-xl border border-border overflow-hidden text-sm bg-muted/30">
      <div className={`p-4 ${isSplit ? "grid grid-cols-2 gap-3" : ""}`}>
        <div className="space-y-2">
          <p className="font-semibold text-foreground">{form.heroTitle || "Hero title"}</p>
          {form.heroSubtitle && <p className="text-xs text-muted-foreground">{form.heroSubtitle}</p>}
          {form.heroCtaLabel && form.heroCtaHref && (
            <span className="inline-block px-2 py-1 rounded bg-primary text-primary-foreground text-xs">
              {form.heroCtaLabel}
            </span>
          )}
        </div>
        {form.heroImageUrl ? (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
            <img
              src={form.heroImageUrl}
              alt={form.heroImageAlt || ""}
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <div className="aspect-video rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">
            No image
          </div>
        )}
      </div>
    </div>
  );
}

function PromoGridPreview({ form }: { form: BlockPreviewFormState }) {
  const items = form.promoItems ?? [];
  const cols = Number(form.promoColumns) || 3;
  const gridClass = cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-4" : "grid-cols-3";

  return (
    <div className="rounded-xl border border-border overflow-hidden text-sm">
      <div className={`grid gap-2 p-3 ${gridClass}`}>
        {items.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-4">No promo items</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="rounded-lg border border-border/60 overflow-hidden bg-muted/20">
              {item.imageUrl ? (
                <div className="aspect-[4/3] relative">
                  <img src={item.imageUrl} alt={item.imageAlt || ""} className="object-cover w-full h-full" />
                </div>
              ) : (
                <div className="aspect-[4/3] flex items-center justify-center text-muted-foreground text-xs">
                  No image
                </div>
              )}
              <div className="p-2">
                <p className="font-medium truncate">{item.title || `Item ${i + 1}`}</p>
                {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function BlockPreview({ type, form }: { type: "HERO" | "BANNER" | "PROMO_GRID"; form: BlockPreviewFormState }) {
  switch (type) {
    case "HERO":
      return <HeroPreview form={form} />;
    case "BANNER":
      return <BannerPreview form={form} />;
    case "PROMO_GRID":
      return <PromoGridPreview form={form} />;
    default:
      return null;
  }
}
