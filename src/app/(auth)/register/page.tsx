"use client";

import { register } from "@/lib/actions/auth";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Database, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(register, null);

  return (
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden font-sans selection:bg-blue-500/20">
      {/* Immersive Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[150px]" />
        <div className="absolute bottom-[0%] right-[0%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="flex w-full z-10">
        
        {/* Left Container: Form Element */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
          
          <div className="w-full max-w-[440px] bg-card/60 backdrop-blur-2xl p-8 sm:p-10 rounded-[40px] border border-border/40 shadow-2xl relative group hover:border-border/60 transition-colors">
            
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all" />
            
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-[24px] flex items-center justify-center text-blue-500 mb-8 border border-blue-500/20 shadow-inner group-hover:scale-105 transition-transform">
              <Database className="w-8 h-8" />
            </div>
            
            <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-foreground">Create Account</h1>
            <p className="text-muted-foreground font-medium mb-10 text-[15px]">Provision your secure independent tenant.</p>

            <form action={formAction} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-[13px] uppercase tracking-wider font-bold text-muted-foreground ml-2">Full Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  type="text" 
                  placeholder="John Doe" 
                  required 
                  className="h-14 rounded-[20px] bg-background/50 border-border/50 px-5 text-base shadow-sm focus-visible:ring-blue-500/20 transition-shadow" 
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="email" className="text-[13px] uppercase tracking-wider font-bold text-muted-foreground ml-2">Email Address</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="admin@school.edu" 
                  required 
                  className="h-14 rounded-[20px] bg-background/50 border-border/50 px-5 text-base shadow-sm focus-visible:ring-blue-500/20 transition-shadow" 
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="password" className="text-[13px] uppercase tracking-wider font-bold text-muted-foreground ml-2">Password</Label>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  className="h-14 rounded-[20px] bg-background/50 border-border/50 px-5 text-base shadow-sm focus-visible:ring-blue-500/20 transition-shadow" 
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
                  "w-full h-14 rounded-[20px] text-base font-bold shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white", 
                  isPending ? "opacity-90" : "hover:scale-[1.02] active:scale-[0.98]"
                 )} 
                disabled={isPending}
              >
                {isPending ? "Provisioning..." : "Provision Instance"}
                {!isPending && <ArrowRight className="w-5 h-5" />}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-[15px] font-medium text-muted-foreground">
                Already have a workspace?{" "}
                <Link href="/login" className="text-blue-500 font-bold hover:underline underline-offset-4">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right Container: Premium Visual Block */}
        <div className="hidden lg:flex w-1/2 p-6">
          <div className="w-full h-full rounded-[48px] bg-card/30 backdrop-blur-3xl border border-border/30 overflow-hidden relative flex items-center justify-center shadow-2xl">
            {/* Elegant inner gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-background to-violet-500/10" />
            
            <div className="relative z-10 max-w-lg p-12 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 border border-border/50 backdrop-blur-md text-sm font-bold text-muted-foreground mb-8 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                Enterprise Security Assured
              </div>
              <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-6 leading-[1.1] text-foreground">
                Scalable Infrastructure <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-500">Day One</span>
              </h2>
              <p className="text-lg text-muted-foreground font-medium leading-relaxed balance-text">
                Your isolated tenant comes pre-configured with dedicated Vector databases, compliance pipelines, and rate-lifted APIs.
              </p>
            </div>

            {/* Premium geometric abstract mesh */}
            <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-blue-500/5 to-transparent mockup-grid" />
          </div>
        </div>

      </div>
    </div>
  );
}
