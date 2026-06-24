"use client";

import { login } from "@/lib/actions/auth";
import { ensureDemoUsers } from "@/lib/actions/demo";
import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { GraduationCap, ArrowRight, CheckCircle2, Sparkles, ShieldCheck, BookOpen, GraduationCap as TeacherIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const DEMO_ACCOUNTS = [
  {
    label: "Super Admin",
    email: "superadmin@elimu.ai",
    role: "Platform-wide controls",
    icon: ShieldCheck,
    color: "text-violet-500",
    bg: "bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20 hover:border-violet-500/40",
  },
  {
    label: "School Admin",
    email: "admin@greenvalley.ac.ke",
    role: "School analytics & teachers",
    icon: BookOpen,
    color: "text-blue-500",
    bg: "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 hover:border-blue-500/40",
  },
  {
    label: "Teacher",
    email: "teacher@greenvalley.ac.ke",
    role: "Generate CBC content",
    icon: TeacherIcon,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 hover:border-emerald-500/40",
  },
] as const;

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [demoLoading, setDemoLoading] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleDemoLogin = async (demoEmail: string) => {
    setDemoLoading(demoEmail);
    try {
      const { password: demoPassword } = await ensureDemoUsers();

      // Write directly to DOM so the form reads the correct values immediately,
      // without relying on a React re-render cycle before requestSubmit fires.
      const emailInput = formRef.current?.querySelector<HTMLInputElement>('[name="email"]');
      const passwordInput = formRef.current?.querySelector<HTMLInputElement>('[name="password"]');
      if (emailInput) emailInput.value = demoEmail;
      if (passwordInput) passwordInput.value = demoPassword;

      // Keep controlled state in sync for display
      setEmail(demoEmail);
      setPassword(demoPassword);

      formRef.current?.requestSubmit();
    } catch {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden font-sans selection:bg-primary/20">
      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[150px]" />
        <div className="absolute bottom-[0%] right-[0%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="flex w-full z-10">

        {/* Left: Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
          <div className="w-full max-w-[440px] space-y-5">

            {/* Card */}
            <div className="bg-card/60 backdrop-blur-2xl p-8 sm:p-10 rounded-[40px] border border-border/40 shadow-2xl relative group hover:border-border/60 transition-colors">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-all" />

              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-[24px] flex items-center justify-center text-primary mb-8 border border-primary/20 shadow-inner group-hover:scale-105 transition-transform">
                <GraduationCap className="w-8 h-8 ml-1" />
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-foreground">Welcome Back</h1>
              <p className="text-muted-foreground font-medium mb-10 text-[15px]">Sign in to your Enterprise Workspace</p>

              <form ref={formRef} action={formAction} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-[13px] uppercase tracking-wider font-bold text-muted-foreground ml-2">Email Address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="admin@school.edu"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 rounded-[20px] bg-background/50 border-border/50 px-5 text-base shadow-sm focus-visible:ring-primary/20 transition-shadow"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between ml-2 mr-2">
                    <Label htmlFor="password" className="text-[13px] uppercase tracking-wider font-bold text-muted-foreground">Password</Label>
                    <Link href="/forgot-password" className="text-[13px] font-bold text-primary hover:text-primary/80 transition-colors">Forgot?</Link>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 rounded-[20px] bg-background/50 border-border/50 px-5 text-base shadow-sm focus-visible:ring-primary/20 transition-shadow"
                  />
                </div>

                {state?.error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-semibold rounded-[16px] p-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    {state.error}
                  </div>
                )}

                <Button
                  type="submit"
                  className={cn(
                    "w-full h-14 rounded-[20px] text-base font-bold shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center gap-2",
                    isPending ? "opacity-90" : "hover:scale-[1.02] active:scale-[0.98]"
                  )}
                  disabled={isPending}
                >
                  {isPending ? "Authenticating..." : "Sign In to Workspace"}
                  {!isPending && <ArrowRight className="w-5 h-5" />}
                </Button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-[15px] font-medium text-muted-foreground">
                  Don't have an enterprise account?{" "}
                  <Link href="/register" className="text-primary font-bold hover:underline underline-offset-4">
                    Request Access
                  </Link>
                </p>
              </div>
            </div>

            {/* Demo Login Panel */}
            <div className="bg-card/40 backdrop-blur-xl rounded-[28px] border border-border/40 p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Try a Demo Account</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((account) => {
                  const isLoading = demoLoading === account.email;
                  return (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => handleDemoLogin(account.email)}
                      disabled={!!demoLoading || isPending}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                        account.bg
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", account.color, "bg-current/10")}>
                        {isLoading ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                        ) : (
                          <account.icon className={cn("w-4 h-4", account.color)} />
                        )}
                      </div>
                      <div>
                        <p className={cn("text-[11px] font-black leading-tight", account.color)}>{account.label}</p>
                        <p className="text-[9px] text-muted-foreground font-semibold mt-0.5 leading-tight">{account.role}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/60 text-center font-medium pt-1">
                Password: <span className="font-black text-muted-foreground">Demo@1234</span> · For evaluation only
              </p>
            </div>

          </div>
        </div>

        {/* Right: Visual */}
        <div className="hidden lg:flex w-1/2 p-6">
          <div className="w-full h-full rounded-[48px] bg-card/30 backdrop-blur-3xl border border-border/30 overflow-hidden relative flex items-center justify-center shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-blue-500/10" />
            <div className="relative z-10 max-w-lg p-12 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 border border-border/50 backdrop-blur-md text-sm font-bold text-muted-foreground mb-8 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Trusted by 500+ Institutions
              </div>
              <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-6 leading-[1.1] text-foreground">
                The Gold Standard in <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Education AI</span>
              </h2>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                Securely isolated multi-tenant architecture designed exclusively for academic excellence and data privacy.
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-primary/5 to-transparent" />
          </div>
        </div>

      </div>
    </div>
  );
}
