import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Lessora",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 border-b border-border bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/">
            <Image src="/brand/lessora-logo.svg" alt="Lessora" width={120} height={32} className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/sign-up" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors">Get started</Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
        <Link href="/" className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <h1 className="mb-3 text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mb-10 text-sm text-muted-foreground">Last updated: June 2026</p>

        <div className="space-y-8 text-muted-foreground">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">What data we collect</h2>
            <p>
              Lessora stores property, unit, tenant, lease, payment, and document data that you
              enter or upload. On the cloud plan, this is stored in a hosted PostgreSQL database
              (Neon). On local install, all data stays on your machine.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">How we use your data</h2>
            <p>
              Your data is used solely to provide the Lessora service. We do not sell, share, or
              use your data for advertising. Tenant email addresses are used to send statements,
              receipts, and notices on your behalf.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Third-party services</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong className="text-foreground">Stripe</strong> — payment processing. Stripe&apos;s privacy policy applies to payment data.</li>
              <li><strong className="text-foreground">Resend</strong> — transactional email delivery on the cloud plan.</li>
              <li><strong className="text-foreground">Cloudflare R2</strong> — file storage for uploaded documents on the cloud plan.</li>
              <li><strong className="text-foreground">Google OAuth</strong> — optional sign-in. No additional profile data is stored beyond your email.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Data retention</h2>
            <p>
              You can delete your account and all associated data at any time from Settings. On
              request, we will confirm deletion within 30 days.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Contact</h2>
            <p>
              Questions about this policy?{" "}
              <Link href="/contact" className="text-primary hover:underline">Contact us</Link>{" "}
              or email{" "}
              <a href="mailto:privacy@lessora.ca" className="text-primary hover:underline">
                privacy@lessora.ca
              </a>
              .
            </p>
          </section>
        </div>
      </div>

      <footer className="border-t border-border bg-surface px-4 py-8">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-4">
          <Image src="/brand/lessora-logo.svg" alt="Lessora" width={100} height={26} className="h-7 w-auto opacity-70" />
          <nav className="flex flex-wrap gap-5 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            <Link href="/sign-in" className="hover:text-foreground transition-colors">Sign in</Link>
          </nav>
          <p className="text-sm text-muted">© {new Date().getFullYear()} Lessora</p>
        </div>
      </footer>
    </div>
  );
}
