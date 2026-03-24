"use client";

import { buttonVariants } from "@/components/ui/button";
import { Sparkles, ArrowRight, Zap, Shield, Database, GraduationCap, LayoutDashboard, LogOut } from "lucide-react";
import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions/auth";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function LandingClient({ session }: { session: any }) {
  return (
    <div className="relative flex flex-col w-full bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">
      {/* Immersive Background Decorators */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden h-[100vh]">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-violet-500/10 blur-[120px]" />
        
        {/* Subtle dot matrix overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-md supports-[backdrop-filter]:bg-background/40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8 max-w-7xl">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="bg-primary/10 text-primary p-1.5 rounded-lg border border-primary/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            Mwalimu<span className="text-primary">RAG</span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            {session?.userId ? (
              <>
                <Link 
                  href="/dashboard" 
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full hidden sm:flex gap-2 bg-background/50 hover:bg-accent")}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <form action={logout}>
                  <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full flex gap-2 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-600 transition-colors")}>
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                  Sign In
                </Link>
                <Link 
                  href="/register" 
                  className={cn(buttonVariants({ size: "sm" }), "rounded-full shadow-md")}
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-20 relative z-10 flex flex-col items-center justify-center">
        
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="flex flex-col items-center text-center w-full"
        >
          {/* Announcement Badge */}
          <motion.div variants={item} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20 shadow-sm backdrop-blur-sm">
            <Sparkles className="w-4 h-4" />
            <span>Mwalimu Enterprise is now live</span>
          </motion.div>

          {/* Hero Headline */}
          <motion.div variants={item} className="mb-6">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-foreground max-w-5xl leading-[1.05]">
              Supercharge your <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-primary via-primary to-blue-600">
                knowledge retrieval
              </span>
            </h1>
          </motion.div>
          
          {/* Subtitle */}
          <motion.p variants={item} className="max-w-2xl text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed balance-text">
            Connect your documents and instantly chat with your data. Experience intelligent curriculum synthesis, lightning-fast queries, and precise answers tailored for modern education.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center justify-center">
            <Link 
              href={session?.userId ? "/dashboard" : "/register"} 
              className={cn(
                buttonVariants({ size: "lg" }), 
                "rounded-full h-14 px-8 text-base gap-2 group shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
              )}
            >
              {session?.userId ? "Go to Dashboard" : "Start Building for Free"}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Product Mockup Visual */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6, type: "spring" }}
          className="relative w-full max-w-5xl mx-auto mt-24 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden aspect-video group"
        >
          {/* Browser / App Header */}
          <div className="w-full h-12 border-b border-border/50 bg-background/50 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <div className="mx-auto w-64 h-6 rounded-md bg-muted/50 flex items-center justify-center text-xs text-muted-foreground font-mono">
              mwalimu.enterprise.app
            </div>
          </div>
          {/* Abstract Dashboard UI */}
          <div className="w-full h-full p-6 flex gap-6 opacity-80 group-hover:opacity-100 transition-opacity duration-500">
             {/* Sidebar & content visual omitted for brevity but preserved conceptually */}
             <div className="w-48 h-full flex-col gap-4 hidden sm:flex">
               <div className="w-full h-8 bg-primary/10 rounded-md border border-primary/20" />
               <div className="w-full h-8 bg-muted/50 rounded-md" />
               <div className="w-full h-8 bg-muted/50 rounded-md" />
             </div>
             <div className="flex-1 flex flex-col gap-6">
               <div className="flex gap-4 w-full h-32">
                 <div className="flex-1 rounded-xl bg-gradient-to-br from-primary/5 to-blue-500/5 shadow-inner" />
                 <div className="flex-1 rounded-xl bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 shadow-inner" />
               </div>
               <div className="flex-1 rounded-xl bg-card border border-border/50" />
             </div>
          </div>
        </motion.div>

        {/* Bento Grid Features */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 text-left w-full relative"
        >
          <div className="flex flex-col gap-4 p-8 rounded-3xl bg-card/60 backdrop-blur-md border border-border/50 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all group overflow-hidden relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
               <Zap className="w-6 h-6 ml-[2px]" />
            </div>
            <h3 className="text-xl font-bold mt-2 tracking-tight">Lightning Fast RAG</h3>
            <p className="text-muted-foreground leading-relaxed">Highly optimized vector search and hybrid retrieval pipelines.</p>
          </div>
          <div className="flex flex-col gap-4 p-8 rounded-3xl bg-card/60 backdrop-blur-md border border-border/50 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all group overflow-hidden relative md:col-span-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center text-blue-500 shadow-inner">
               <Database className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mt-2 tracking-tight">KICD Native Curriculum</h3>
            <p className="text-muted-foreground leading-relaxed">Natively understands CBC taxonomy schemas resulting in pristine generation.</p>
          </div>
          <div className="flex flex-col gap-4 p-8 rounded-3xl bg-card/60 backdrop-blur-md border border-border/50 shadow-sm hover:shadow-xl hover:border-green-500/30 transition-all md:col-span-3 items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center text-green-500 border border-green-500/20 shadow-inner">
               <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mt-2 tracking-tight">Enterprise Architecture</h3>
            <p className="text-muted-foreground leading-relaxed max-w-2xl">Zero cross-contamination. Strict workspace partitioning via Enterprise encryption.</p>
          </div>
        </motion.div>

      </main>
      
      <footer className="w-full border-t border-border/40 py-10 mt-16 bg-background/50 backdrop-blur-sm z-10 relative">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground gap-4">
          <div className="flex items-center gap-2 font-bold text-foreground">
             <GraduationCap className="w-4 h-4 text-primary" /> MwalimuRAG
          </div>
          <p>© 2026 Mwalimu Education Platform. Built for the Modern Curriculum.</p>
        </div>
      </footer>
    </div>
  );
}
