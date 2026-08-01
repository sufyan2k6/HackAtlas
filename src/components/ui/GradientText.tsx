import { cn } from "@/lib/utils";

type GradientVariant = "violet" | "blue" | "emerald" | "amber" | "rainbow";

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  variant?: GradientVariant;
  as?: "span" | "h1" | "h2" | "h3" | "p";
}

const gradientStyles: Record<GradientVariant, string> = {
  violet:
    "bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent",
  blue:
    "bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent",
  emerald:
    "bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent",
  amber:
    "bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent",
  rainbow:
    "bg-gradient-to-r from-violet-400 via-pink-400 to-amber-400 bg-clip-text text-transparent",
};

export function GradientText({
  children,
  className,
  variant = "violet",
  as: Tag = "span",
}: GradientTextProps) {
  return (
    <Tag className={cn(gradientStyles[variant], className)}>{children}</Tag>
  );
}
