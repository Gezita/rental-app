import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
  /** Icon mark only, or full logo with wordmark */
  variant?: "icon" | "full";
  className?: string;
};

const LOGO_ASPECT = 800 / 204;

const sizes = {
  sm: { icon: 32, fullHeight: 28 },
  md: { icon: 36, fullHeight: 32 },
  lg: { icon: 56, fullHeight: 48 },
};

export function BrandLogo({
  href = "/dashboard",
  size = "md",
  variant = "icon",
  className,
}: BrandLogoProps) {
  const s = sizes[size];

  const fullHeight = s.fullHeight;
  const fullWidth = Math.round(fullHeight * LOGO_ASPECT);

  const image =
    variant === "full" ? (
      <Image
        src="/brand/zigglo-logo.svg"
        alt="zigglo"
        width={fullWidth}
        height={fullHeight}
        className="h-auto w-auto max-h-full object-contain"
        priority
      />
    ) : (
      <Image
        src="/brand/zigglo-icon.svg"
        alt="zigglo"
        width={s.icon}
        height={s.icon}
        className="rounded-xl object-contain"
        priority
      />
    );

  const classes = cn("inline-flex items-center", className);

  if (!href) {
    return <div className={classes}>{image}</div>;
  }

  return (
    <Link href={href} className={cn(classes, "rounded-xl transition-opacity hover:opacity-90")}>
      {image}
    </Link>
  );
}
