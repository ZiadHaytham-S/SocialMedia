import Link from "next/link";
import { cn, ui } from "@/lib/theme/ui";

type NavIconButtonProps = {
  label: string;
  title?: string;
  disabled?: boolean;
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
};

export function NavIconButton({ label, title, disabled, href, onClick, children }: NavIconButtonProps) {
  const className = cn(
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-t-secondary transition hover:bg-surface-hover",
    disabled && "cursor-not-allowed opacity-50",
  );

  if (href && !disabled) {
    return (
      <Link className={className} href={href} title={title ?? label}>
        {children}
        <span className="sr-only">{label}</span>
      </Link>
    );
  }

  return (
    <button className={className} disabled={disabled} onClick={onClick} title={title ?? label} type="button">
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

type NavCenterTabProps = {
  label: string;
  active?: boolean;
  disabled?: boolean;
  href?: string;
  title?: string;
  onClick?: () => void;
  children: React.ReactNode;
};

export function NavCenterTab({ label, active, disabled, href, title, onClick, children }: NavCenterTabProps) {
  const tabClass = cn(
    "relative flex h-full w-[min(72px,14vw)] shrink-0 items-center justify-center transition sm:w-20 lg:w-[106px]",
    active ? "text-fb" : "text-t-muted",
    !disabled && "hover:bg-surface-hover",
    disabled && "cursor-not-allowed opacity-50",
  );

  const iconWrap = (
    <>
      <span className="flex h-7 w-7 items-center justify-center">{children}</span>
      {active ? <span className="absolute inset-x-2 bottom-0 h-1 rounded-t-full bg-fb" /> : null}
      <span className="sr-only">{label}</span>
    </>
  );

  if (href && !disabled) {
    return (
      <Link className={tabClass} href={href} title={title ?? label}>
        {iconWrap}
      </Link>
    );
  }

  return (
    <button className={tabClass} disabled={disabled} onClick={onClick} title={title ?? label} type="button">
      {iconWrap}
    </button>
  );
}
