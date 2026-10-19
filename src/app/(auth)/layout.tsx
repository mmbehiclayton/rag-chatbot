import { Logo } from "@/components/shared/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-background px-4 py-8 sm:justify-center">
      <Logo className="mb-6" />
      <main className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        {children}
      </main>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Elimu · AI planning for CBC teachers in Kenya
      </p>
    </div>
  );
}
