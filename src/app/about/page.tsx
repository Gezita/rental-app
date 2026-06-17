import Link from "next/link";
import Image from "next/image";
import { Building2, CheckCircle2, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "About Lessora",
  description:
    "Lessora is a rental management workspace built for small Ontario landlords who want to run their business, not just collect rent.",
};

export default function AboutPage() {
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

      <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-muted text-primary">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">
          About Lessora
        </h1>

        <div className="prose prose-neutral max-w-none space-y-6 text-muted-foreground">
          <p className="text-lg text-foreground">
            Lessora is a rental property workspace built for small Ontario landlords who manage
            1–50 units and want to spend less time on admin.
          </p>

          <p>
            Most property management software is designed for large portfolios, property
            management companies, or the US market. Small Ontario landlords — people who own a
            duplex or a few small buildings — end up stitching together spreadsheets, email
            threads, and PDF templates to manage what should be simple.
          </p>

          <p>
            Lessora brings together the workflows that actually matter: utility bill splitting,
            monthly statement generation, LTB notices, and document storage — in one place that
            stays in sync with a tenant-facing portal.
          </p>

          <h2 className="text-xl font-bold text-foreground">Built for Ontario</h2>
          <p>
            Ontario rental law has specific requirements: the Standard Lease 2229E, LTB notice
            forms, and utility billing arrangements that differ from most North American
            templates. Lessora is built around these realities, not adapted from a US product.
          </p>

          <ul className="space-y-2">
            {[
              "Ontario Standard Lease (Form 2229E) — auto-filled from your unit data",
              "LTB notice wizard: N4, N5, N12, N13, L1, L2 and more",
              "T776 rental income summary for CRA tax reporting",
              "Utility split rules that match how Ontario utilities are billed",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <h2 className="text-xl font-bold text-foreground">Who we serve</h2>
          <p>
            Landlords managing 1–50 units who want a workspace, not accounting software. If
            you&apos;re looking for a general ledger, bank reconciliation, or syndicated listings,
            there are better tools. If you want to generate and send statements in under a
            minute, keep all your documents in one place, and let tenants pay online — that&apos;s
            Lessora.
          </p>

          <h2 className="text-xl font-bold text-foreground">Open by default</h2>
          <p>
            Lessora can run entirely on your own computer — no subscription, no cloud, no data
            leaving your machine. For landlords who want hosted access, automatic backups, email
            delivery, and the tenant portal, there&apos;s a cloud plan at{" "}
            <a href="https://lessora.ca" className="text-primary hover:underline">
              lessora.ca
            </a>
            .
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm font-medium hover:bg-surface-muted transition-colors"
          >
            Contact us
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-surface px-4 py-8">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4">
          <Image
            src="/brand/lessora-logo.svg"
            alt="Lessora"
            width={100}
            height={26}
            className="h-7 w-auto opacity-70"
          />
          <nav className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link href="/sign-in" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </nav>
          <p className="text-sm text-muted">© {new Date().getFullYear()} Lessora</p>
        </div>
      </footer>
    </div>
  );
}
