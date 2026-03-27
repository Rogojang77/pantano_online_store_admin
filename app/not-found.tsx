import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-lg text-sm text-muted-foreground">
        The page you are looking for does not exist or you may not have access to it.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-all duration-200 hover:bg-primary/90"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
