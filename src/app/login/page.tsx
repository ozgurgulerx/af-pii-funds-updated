"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Database,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSSOLogin = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    router.push("/chat");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-canvas">
      <div className="absolute inset-0 grid-pattern opacity-35" />
      <div className="absolute left-[-8%] top-[-10%] h-[28rem] w-[28rem] rounded-full bg-primary/12 blur-3xl" />
      <div className="absolute right-[-10%] top-[15%] h-[24rem] w-[24rem] rounded-full bg-accent/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="rounded-[36px] border border-border/80 bg-card/92 px-6 py-8 shadow-panel md:px-8"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Updated frontend shell
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary text-primary-foreground shadow-blue">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  Fund Intelligence
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground md:text-[15px]">
                  Same protected backend, redesigned analyst workspace. Search fund data, inspect citations,
                  and keep PII checks active through the entire conversation flow.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <FeatureCard
                icon={ShieldCheck}
                title="PII Guard"
                description="Automatic screening blocks sensitive identifiers before the request is sent."
              />
              <FeatureCard
                icon={Database}
                title="Evidence Rail"
                description="Citations stay visible so answers can be checked without losing context."
              />
              <FeatureCard
                icon={Sparkles}
                title="Blue Shell"
                description="A new visual system borrowed from the g-fon layout and adapted for this app."
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: "easeOut" }}
            className="rounded-[36px] border border-border/80 bg-card/92 px-6 py-8 shadow-panel md:px-8"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Secure access
            </div>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">
              Sign in to open the updated workspace
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Authentication is still mocked for this frontend, but the page now matches the new product shell and
              transitions directly into the redesigned chat workspace.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-[28px] border border-border/75 bg-background/78 px-4 py-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  What stays the same
                </div>
                <ul className="mt-3 space-y-2 text-sm text-foreground/85">
                  <li>Backend routing and data retrieval</li>
                  <li>`/api/chat`, `/api/pii`, and `/api/health`</li>
                  <li>PII guidance and streaming response handling</li>
                </ul>
              </div>

              <Button
                onClick={handleSSOLogin}
                disabled={isLoading}
                className="h-12 w-full justify-center gap-2 text-base"
              >
                {isLoading ? "Launching workspace..." : "Sign in with SSO"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[26px] border border-border/75 bg-background/80 px-4 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
