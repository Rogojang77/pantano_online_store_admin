"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminRouteGuard } from "@/components/guards/admin-route-guard";
import { MediaPicker } from "@/components/media/media-picker";
import { contactService, type ContactInfoResponse } from "@/services/contact.service";
import { toast } from "sonner";

const openingHoursRowSchema = z.object({
  day: z.string().min(1, "Day is required"),
  time: z.string().min(1, "Time is required"),
});

const formSchema = z.object({
  pageTitle: z.string().min(1, "Page title is required"),
  imageUrl: z.string().optional(),
  addressStreet: z.string(),
  addressCity: z.string(),
  addressPostalCode: z.string(),
  phone: z.string(),
  email: z.string().email("Invalid email").or(z.literal("")),
  openingHoursHeadline: z.string().optional(),
  openingHoursRows: z.array(openingHoursRowSchema),
  openingHoursSummary: z.string().optional(),
  mapUrl: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

function ContactForm({
  initial,
  onSaved,
}: {
  initial: ContactInfoResponse | null;
  onSaved: () => void;
}) {
  const defaultRows = [
    { day: "Lun. – Sâm.", time: "08:00 – 21:00" },
    { day: "Dum.", time: "08:00 – 19:00" },
  ];

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pageTitle: "Contact",
      imageUrl: "",
      addressStreet: "",
      addressCity: "",
      addressPostalCode: "",
      phone: "",
      email: "",
      openingHoursHeadline: "",
      openingHoursRows: defaultRows,
      openingHoursSummary: "",
      mapUrl: "",
      latitude: undefined as number | undefined,
      longitude: undefined as number | undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "openingHoursRows" });

  useEffect(() => {
    if (initial == null) return;
    const rows =
      (initial.openingHours?.rows?.length ?? 0) > 0 ? initial.openingHours!.rows : defaultRows;
    reset({
      pageTitle: initial.pageTitle ?? "Contact",
      imageUrl: initial.imageUrl ?? "",
      addressStreet: initial.address?.street ?? "",
      addressCity: initial.address?.city ?? "",
      addressPostalCode: initial.address?.postalCode ?? "",
      phone: initial.phone ?? "",
      email: initial.email ?? "",
      openingHoursHeadline: initial.openingHours?.headline ?? "",
      openingHoursRows: rows,
      openingHoursSummary: initial.openingHoursSummary ?? "",
      mapUrl: initial.mapUrl ?? "",
      latitude: initial.latitude ?? undefined,
      longitude: initial.longitude ?? undefined,
    });
  }, [initial, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      await contactService.update({
        pageTitle: data.pageTitle,
        imageUrl: data.imageUrl || undefined,
        addressStreet: data.addressStreet,
        addressCity: data.addressCity,
        addressPostalCode: data.addressPostalCode,
        phone: data.phone,
        email: data.email,
        openingHoursHeadline: data.openingHoursHeadline || undefined,
        openingHoursRows: data.openingHoursRows,
        openingHoursSummary: data.openingHoursSummary || undefined,
        mapUrl: data.mapUrl || undefined,
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
      });
      toast.success("Contact info saved.");
      onSaved();
    } catch {
      toast.error("Failed to save contact info.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact page content</CardTitle>
          <CardDescription>
            Address, phone, email and opening hours shown on the storefront Contact page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pageTitle">Page title</Label>
              <Input id="pageTitle" {...register("pageTitle")} placeholder="Contact" />
              {errors.pageTitle && (
                <p className="text-sm text-destructive">{errors.pageTitle.message}</p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="imageUrl">Contact page image</Label>
              <Controller
                control={control}
                name="imageUrl"
                render={({ field }) => (
                  <MediaPicker
                    value={field.value ?? ""}
                    onChange={(url) => field.onChange(url)}
                    placeholder="Choose image or paste URL"
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Optional hero/banner image shown on the storefront Contact page. Choose from the media library or enter a URL.
              </p>
              {errors.imageUrl && (
                <p className="text-sm text-destructive">{errors.imageUrl.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="addressStreet" className="text-muted-foreground font-normal">
                  Street
                </Label>
                <Input id="addressStreet" {...register("addressStreet")} placeholder="Strada Exemplu nr. 1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressCity" className="text-muted-foreground font-normal">
                  City
                </Label>
                <Input id="addressCity" {...register("addressCity")} placeholder="București" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressPostalCode" className="text-muted-foreground font-normal">
                  Postal code
                </Label>
                <Input id="addressPostalCode" {...register("addressPostalCode")} placeholder="010101" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" {...register("phone")} placeholder="+40 21 123 4567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} placeholder="contact@pantano.ro" />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <Label>Opening hours</Label>
            <div className="space-y-2">
              <Input
                {...register("openingHoursHeadline")}
                placeholder="Program de lucru (optional)"
                className="max-w-md"
              />
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-wrap items-center gap-2">
                  <Input
                    {...register(`openingHoursRows.${index}.day`)}
                    placeholder="e.g. Lun. – Sâm."
                    className="w-40"
                  />
                  <Input
                    {...register(`openingHoursRows.${index}.time`)}
                    placeholder="e.g. 08:00 – 21:00"
                    className="w-40"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="text-muted-foreground"
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ day: "", time: "" })}
              >
                Add row
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingHoursSummary" className="text-muted-foreground font-normal">
                One-line summary (for infobox)
              </Label>
              <Input
                id="openingHoursSummary"
                {...register("openingHoursSummary")}
                placeholder="Luni – Sâmbătă 08:00 – 21:00; Duminică 08:00 – 19:00"
                className="max-w-xl"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Map</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mapUrl" className="text-muted-foreground font-normal">
                  Map URL (Planificare rută link)
                </Label>
                <Input
                  id="mapUrl"
                  type="url"
                  {...register("mapUrl")}
                  placeholder="https://www.google.com/maps/..."
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="latitude" className="text-muted-foreground font-normal">
                  Latitude (for embedded map)
                </Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="e.g. 47.044857"
                  {...register("latitude", {
                    setValueAs: (v) => (v === "" || Number.isNaN(Number(v)) ? undefined : Number(v)),
                  })}
                />
                <p className="text-xs text-muted-foreground">-90 to 90. Get from Google Maps (right-click → coordinates).</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude" className="text-muted-foreground font-normal">
                  Longitude (for embedded map)
                </Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g. 21.898144"
                  {...register("longitude", {
                    setValueAs: (v) => (v === "" || Number.isNaN(Number(v)) ? undefined : Number(v)),
                  })}
                />
                <p className="text-xs text-muted-foreground">-180 to 180.</p>
              </div>
            </div>
          </div>

        </CardContent>
        <CardContent className="pt-0">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save contact info"
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

export default function ContactPage() {
  const [data, setData] = useState<ContactInfoResponse | null | undefined>(undefined);

  const load = () => {
    contactService
      .get()
      .then(setData)
      .catch(() => setData(null));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AdminRouteGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contact info</h1>
          <p className="text-muted-foreground mt-1">
            Configure address, phone, email and opening hours for the storefront Contact page.
          </p>
        </div>
        {data === undefined ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : (
          <ContactForm initial={data ?? null} onSaved={load} />
        )}
      </div>
    </AdminRouteGuard>
  );
}
