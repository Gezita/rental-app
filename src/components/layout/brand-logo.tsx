import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "full";
  className?: string;
};

const sizes = {
  sm: { h: 22, text: 20 },
  md: { h: 26, text: 24 },
  lg: { h: 32, text: 30 },
};

const ICON_ASPECT = 102 / 139;

function LessoraIcon({ height }: { height: number }) {
  const width = Math.round(height * ICON_ASPECT);
  return (
    <svg width={width} height={height} viewBox="0 0 102 139" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M102 136.429C102 137.533 101.105 138.429 100 138.429H4.63986C2.88547 138.429 1.98123 136.331 3.18583 135.055L40.6942 95.3406C41.072 94.9406 41.598 94.7139 42.1482 94.7139H96.9069C98.7246 94.7139 99.5998 92.4852 98.2678 91.2483L3.7322 3.4656C2.40018 2.22873 3.27536 0 5.09309 0H100C101.105 0 102 0.895431 102 2V136.429Z" fill="currentColor" />
      <path d="M0.420911 9.56055C0.426805 7.8183 2.50255 6.91632 3.78029 8.10059L41.0742 42.6758C41.487 43.0586 41.7191 43.5982 41.7139 44.1611L41.293 89.501C41.2883 90.0052 41.0933 90.4898 40.7471 90.8564L3.47072 130.324C2.22602 131.642 0.0114582 130.757 0.0175908 128.944L0.420911 9.56055ZM4.03322 123.903L37.2998 88.6787L37.7051 45.0068L4.40529 14.1338L4.03322 123.903Z" fill="currentColor" />
      <circle cx="31.4286" cy="66.4286" r="2.42857" fill="currentColor" />
    </svg>
  );
}

export function BrandLogo({
  href = "/dashboard",
  size = "md",
  variant = "icon",
  className,
}: BrandLogoProps) {
  const s = sizes[size];

  const inner =
    variant === "full" ? (
      <span className="inline-flex items-center gap-2 text-primary">
        <LessoraIcon height={s.h} />
        <span
          className="font-bold leading-none tracking-tight"
          style={{ fontFamily: "var(--font-outfit, 'Outfit', sans-serif)", fontSize: s.text }}
        >
          Lessora
        </span>
      </span>
    ) : (
      <span className="inline-flex text-primary">
        <LessoraIcon height={s.h} />
      </span>
    );

  const classes = cn("inline-flex items-center", className);

  if (!href) {
    return <div className={classes}>{inner}</div>;
  }

  return (
    <Link href={href} className={cn(classes, "rounded-xl transition-opacity hover:opacity-90")}>
      {inner}
    </Link>
  );
}
