import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  Zap,
  ChevronRight,
  CheckCircle2,
  Receipt,
  FolderOpen,
  Scale,
  BarChart3,
  Upload,
  Send,
  ArrowRight,
  Shield,
  Star,
} from "lucide-react";
import { getSessionUserId } from "@/lib/auth";
import { isLocalDataOnlyDeploy } from "@/lib/deploy-config";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Lessora — Rental management for Ontario landlords",
  description:
    "Everything you need to run a small rental business. Utility splits, monthly statements, LTB forms, and a tenant portal — all in one place.",
};

export default async function HomePage() {
  if (isLocalDataOnlyDeploy()) {
    redirect("/get-started");
  }

  const userId = await getSessionUserId();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand/lessora-logo.svg"
              alt="Lessora"
              width={120}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
          <div className="hidden items-center gap-6 text-sm font-medium text-muted-foreground sm:flex">
            <Link href="#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-surface px-4 py-20 text-center sm:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary-muted)_0%,transparent_65%)] opacity-60" />
        <div className="relative mx-auto max-w-4xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-muted px-4 py-1.5 text-sm font-medium text-primary">
            <Star className="h-3.5 w-3.5" />
            Built for Ontario landlords
          </div>
          <h1 className="font-display mb-6 text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-6xl">
            Run your rental business,{" "}
            <span className="text-primary">not just collect rent</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Lessora is the rental workspace built for small Ontario landlords. Utility splits,
            monthly statements, LTB forms, and a tenant portal — everything in one place.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground shadow-md hover:bg-primary-hover transition-all hover:shadow-lg"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-7 py-3.5 text-base font-medium text-foreground hover:bg-surface-muted transition-colors"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">
            Free for local install. Cloud plans from $1/unit/mo.
          </p>
        </div>
      </section>

      {/* Social proof strip */}
      <div className="border-y border-border bg-surface-muted px-4 py-5">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Utility splits in seconds
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            LTB forms built in
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            T776 export for tax time
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Tenant portal included
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Stripe rent payments
          </div>
        </div>
      </div>

      {/* Features */}
      <section id="features" className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything your rental business needs
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Purpose-built for Ontario landlords managing 1–50 units. Not accounting software —
              a workspace that matches how you actually work.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Receipt className="h-5 w-5" />}
              title="Monthly billing workflow"
              description="Generate statements with prior-balance roll-forward, Stripe pay links, and PDF delivery. Track paid, partial, and overdue in one view."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Utility splits"
              description="Import bills from spreadsheets or enter manually. Set split rules per unit and generate accurate per-tenant utility charges every month."
            />
            <FeatureCard
              icon={<FolderOpen className="h-5 w-5" />}
              title="Document hub"
              description="Upload leases, inspection reports, LTB notices, and photos by property or unit. Search and share with tenants in one click."
            />
            <FeatureCard
              icon={<Scale className="h-5 w-5" />}
              title="Ontario LTB forms"
              description="Access and fill LTB notices (N4, N12, L1, and more) directly in the app. Auto-filled from your tenant and unit data."
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="T776 tax export"
              description="Generate a T776 rental income summary at tax time. Export to PDF or use as a reference — no separate spreadsheet required."
            />
            <FeatureCard
              icon={<Building2 className="h-5 w-5" />}
              title="Tenant portal"
              description="Tenants log in to view statements, pay rent, read notices, and submit maintenance requests — all synced with your landlord workspace."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="bg-surface px-4 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              From setup to statement in minutes
            </h2>
            <p className="text-muted-foreground">
              Lessora is designed to get out of your way. Three steps, no accounting degree
              required.
            </p>
          </div>

          <div className="relative grid gap-8 sm:grid-cols-3">
            {/* connector line (desktop) */}
            <div className="absolute left-1/6 right-1/6 top-8 hidden h-px bg-border sm:block" />

            <Step
              number={1}
              icon={<Building2 className="h-5 w-5" />}
              title="Add your property"
              description="Enter your property address, create units, and add tenants with their lease dates and rent amounts."
            />
            <Step
              number={2}
              icon={<Upload className="h-5 w-5" />}
              title="Import utility bills"
              description="Upload a spreadsheet or enter bills manually. Lessora splits the total across your units based on the rules you set."
            />
            <Step
              number={3}
              icon={<Send className="h-5 w-5" />}
              title="Send statements"
              description="Preview, generate, and email statements to all tenants with one click. Tenants pay online; you see it in your dashboard."
            />
          </div>
        </div>
      </section>

      {/* Ontario wedge */}
      <section className="border-y border-border bg-primary-muted px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 sm:grid-cols-2 sm:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Shield className="h-3.5 w-3.5" />
                Ontario-first
              </div>
              <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
                Built around how Ontario rentals work
              </h2>
              <p className="mb-6 text-muted-foreground">
                Utility splitting, LTB forms, and the standard lease — the workflows that
                matter most to Ontario landlords are built in, not bolted on.
              </p>
              <ul className="space-y-3">
                {[
                  "Ontario Standard Lease 2229E — auto-filled and e-sign ready",
                  "LTB notice wizard: N4, N5, N12, N13, L1, L2 and more",
                  "T776 rental income summary for tax reporting",
                  "Utility splits that match Ontario's common utility arrangements",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "LTB forms", value: "20+", sub: "pre-loaded" },
                { label: "Utility types", value: "6", sub: "gas, hydro, water…" },
                { label: "Statement time", value: "<1 min", sub: "per property" },
                { label: "Tax export", value: "T776", sub: "PDF ready" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-surface p-4 text-center shadow-sm"
                >
                  <div className="text-2xl font-bold text-primary">{stat.value}</div>
                  <div className="mt-0.5 text-xs font-semibold text-foreground">{stat.label}</div>
                  <div className="text-xs text-muted">{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, unit-based pricing
            </h2>
            <p className="text-muted-foreground">
              Pay only for what you manage. Local install is always free.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Local / Free */}
            <div className="rounded-2xl border border-border bg-surface p-8">
              <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
                Local install
              </div>
              <div className="mb-2 text-4xl font-bold">Free</div>
              <p className="mb-6 text-sm text-muted-foreground">
                Self-host on your own computer. Full features, no limits, no subscription.
              </p>
              <ul className="mb-8 space-y-2.5">
                {[
                  "All features included",
                  "Unlimited properties & units",
                  "Your data stays on your machine",
                  "Community support",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="/get-started"
                className="block rounded-lg border border-border px-4 py-3 text-center text-sm font-semibold text-foreground hover:bg-surface-muted transition-colors"
              >
                View install instructions
              </a>
            </div>

            {/* Cloud */}
            <div className="relative rounded-2xl border-2 border-primary bg-surface p-8 shadow-md">
              <div className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                Recommended
              </div>
              <div className="mb-1 text-sm font-semibold uppercase tracking-wide text-primary">
                Cloud — lessora.ca
              </div>
              <div className="mb-2 flex items-end gap-1">
                <span className="text-4xl font-bold">$1</span>
                <span className="mb-1 text-lg font-medium text-muted-foreground">/unit/mo</span>
              </div>
              <p className="mb-6 text-sm text-muted-foreground">
                Hosted, always-on, with email delivery and tenant portal included. $2/unit above
                10 units.
              </p>
              <ul className="mb-8 space-y-2.5">
                {[
                  "Everything in Local, plus:",
                  "Hosted database (Neon PostgreSQL)",
                  "Email via Resend (noreply@lessora.ca)",
                  "Tenant portal with online payments",
                  "Automatic backups",
                  "1–10 units: $1/unit/mo",
                  "15 units: $30/mo · 25 units: $50/mo",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className="block rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                Get started free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-surface-muted px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to simplify your rental management?
          </h2>
          <p className="mb-8 text-muted-foreground">
            Join Ontario landlords who use Lessora to spend less time on admin and more time on
            what matters.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-base font-semibold text-primary-foreground hover:bg-primary-hover transition-colors shadow-md"
            >
              Create your account
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-7 py-3.5 text-base font-medium hover:bg-surface transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Image
                src="/brand/lessora-logo.svg"
                alt="Lessora"
                width={100}
                height={26}
                className="h-7 w-auto opacity-70"
              />
            </div>
            <nav className="flex flex-wrap justify-center gap-5 text-sm text-muted-foreground">
              <Link href="/about" className="hover:text-foreground transition-colors">
                About
              </Link>
              <Link href="/contact" className="hover:text-foreground transition-colors">
                Contact
              </Link>
              <Link href="/sign-in" className="hover:text-foreground transition-colors">
                Sign in
              </Link>
              <Link href="/get-started" className="hover:text-foreground transition-colors">
                Local install
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
            </nav>
            <p className="text-sm text-muted">
              © {new Date().getFullYear()} Lessora
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-muted text-primary">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Step({
  number,
  icon,
  title,
  description,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
        {icon}
        <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
          {number}
        </span>
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
