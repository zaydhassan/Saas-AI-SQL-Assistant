"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Facebook,
  Instagram,
  Linkedin,
  Send,
  Twitter,
  Sparkles,
  Lock,
} from "lucide-react";

const PRODUCT_LINKS: { label: string; href: string; protected?: boolean }[] = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Playground", href: "/playground", protected: true },
  { label: "Pricing", href: "/pricing" },
];

function FooterLink({ label, href, protected: isProtected, isLoggedIn }: { label: string; href: string; protected?: boolean; isLoggedIn?: boolean }) {
  const router = useRouter();

  function handleClick(e: React.MouseEvent) {
    if (!isProtected) return;
    if (!isLoggedIn) {
      e.preventDefault();
      toast.info("Please log in to continue", {
        description: "Redirecting you to the login page…",
      });
      router.push("/login");
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="group flex items-center gap-1.5 transition-colors hover:text-white"
      style={{ color: "var(--muted)" }}
    >
      {label}
      {isProtected && (
        <Lock size={11} className="opacity-50 transition-opacity group-hover:opacity-80" />
      )}
    </Link>
  );
}

export default function FooterDemo({ isLoggedIn }: { isLoggedIn?: boolean } = {}) {
  return (
    <footer
      className="relative z-10 mt-24 border-t"
      style={{ borderColor: "var(--border-soft)", background: "rgba(5,8,22,0.6)" }}
    >
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid items-start gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white"
                style={{ background: "var(--gradient-brand)", boxShadow: "0 8px 20px var(--accent-glow)" }}
              >
                <Sparkles size={16} />
              </span>
              <span className="font-display text-lg font-semibold text-white">AI SQL</span>
            </div>
            <p className="mt-4 max-w-sm text-sm" style={{ color: "var(--muted)" }}>
              Talk to your data like ChatGPT. Convert natural language into optimized
              SQL, execute securely, and get instant insights.
            </p>
            <form className="relative mt-6 max-w-sm" onSubmit={(e) => { e.preventDefault(); toast.success("Subscribed — check your inbox!"); }}>
              <Input
                type="email"
                placeholder="Enter your email"
                className="pr-12"
                suppressHydrationWarning
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "var(--border-soft)",
                }}
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8 rounded-full"
                suppressHydrationWarning
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Subscribe</span>
              </Button>
            </form>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-2)" }}>
              Product
            </h3>
            <nav className="space-y-3 text-sm">
              {PRODUCT_LINKS.map((l) => (
                <FooterLink key={l.href} label={l.label} href={l.href} protected={l.protected} isLoggedIn={isLoggedIn} />
              ))}
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-2)" }}>
              Contact
            </h3>
            <address className="space-y-2 text-sm not-italic" style={{ color: "var(--muted)" }}>
              <p>123 Innovation Street</p>
              <p>Tech City, TC 12345</p>
              <p>Phone: (+91) 9100697101</p>
              <p>Email: zaydthirteen@gmail.com</p>
            </address>
          </div>

          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-2)" }}>
              Follow Us
            </h3>
            <div className="flex gap-3">
              <SocialIcon icon={<Facebook />} label="Facebook" />
              <SocialIcon icon={<Twitter />} label="Twitter" />
              <SocialIcon icon={<Instagram />} label="Instagram" />
              <SocialIcon icon={<Linkedin />} label="LinkedIn" />
            </div>
          </div>
        </div>

        <div
          className="mt-14 flex flex-col gap-4 border-t pt-6 md:flex-row md:items-center md:justify-between"
          style={{ borderColor: "var(--border-soft)" }}
        >
          <p className="text-xs" style={{ color: "var(--muted-2)" }}>
            © 2025 AI SQL. All rights reserved.
          </p>
          <nav className="flex gap-6 text-xs" style={{ color: "var(--muted-2)" }}>
            <a href="/privacy" className="transition-colors hover:text-white">Privacy Policy</a>
            <a href="/terms" className="transition-colors hover:text-white">Terms of Service</a>
            <a href="/cookies" className="transition-colors hover:text-white">Cookie Settings</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "var(--border-soft)" }}
          >
            {icon}
            <span className="sr-only">{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}