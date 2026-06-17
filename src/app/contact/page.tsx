import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowLeft, Clock } from "lucide-react";

export const metadata = {
  title: "Contact Lessora",
  description: "Get in touch with the Lessora team.",
};

export default function ContactPage() {
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

      <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-muted text-primary">
          <Mail className="h-6 w-6" />
        </div>
        <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">Get in touch</h1>
        <p className="mb-10 text-muted-foreground">
          Questions, feedback, or just want to say hello — reach out any time.
        </p>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-muted text-primary">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">Email</div>
                <a
                  href="mailto:hello@lessora.ca"
                  className="mt-1 text-primary hover:underline"
                >
                  hello@lessora.ca
                </a>
                <p className="mt-1 text-sm text-muted-foreground">
                  Best for general questions, feedback, and feature requests.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-muted text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">Response time</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  We typically respond within 1–2 business days. For urgent account issues,
                  include your account email in the subject line.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-2xl bg-surface-muted border border-border p-6">
          <h2 className="mb-2 font-semibold">Looking for docs?</h2>
          <p className="text-sm text-muted-foreground">
            If you&apos;re self-hosting Lessora, the{" "}
            <Link href="/get-started" className="text-primary hover:underline">
              local install guide
            </Link>{" "}
            covers setup, environment variables, and database configuration.
          </p>
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
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/sign-in" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </nav>
          <p className="text-sm text-muted">© {new Date().getFullYear()} Lessora</p>
        </div>
      </footer>
    </div>
  );
}
