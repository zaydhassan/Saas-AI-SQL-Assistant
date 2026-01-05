"use client";

import * as React from "react";
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
} from "lucide-react";

export default function FooterDemo() {
  return (
    <footer className="border-t border-white/10 bg-background text-foreground">
     <div className="mx-auto max-w-7xl px-6 py-16">

       <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4 items-start">

          <div>
            <h2 className="text-2xl font-semibold
            ">
              Stay Connected
            </h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-sm">
              Join our newsletter for product updates, new features,
              and best practices.
            </p>

            <form className="relative mt-6 max-w-sm">
              <Input
                type="email"
                placeholder="Enter your email"
                className="pr-12"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8 rounded-full"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Subscribe</span>
              </Button>
            </form>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">
              Quick Links
            </h3>
            <nav className="space-y-4 text-sm text-muted-foreground">
              <a href="/" className="block hover:text-primary">Home</a>
              <a href="/features" className="block hover:text-primary">Features</a>
              <a href="/playground" className="block hover:text-primary">Playground</a>
              <a href="/pricing" className="block hover:text-primary">Pricing</a>
              
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">
              Contact
            </h3>
            <address className="space-y-2 text-sm not-italic text-muted-foreground">
              <p>123 Innovation Street</p>
              <p>Tech City, TC 12345</p>
              <p>Phone: (+91) 9100697101</p>
              <p>Email: zaydthirteen@gmail.com</p>
            </address>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide">
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

        <div className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-muted-foreground">
            © 2025 AI SQL. All rights reserved.
          </p>

          <nav className="flex gap-6 text-xs text-muted-foreground">
            <a href="/privacy" className="hover:text-primary">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-primary">
              Terms of Service
            </a>
            <a href="/cookies" className="hover:text-primary">
              Cookie Settings
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
function SocialIcon({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" className="rounded-full">
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