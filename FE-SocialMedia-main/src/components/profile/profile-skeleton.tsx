import { cn, ui } from "@/lib/theme/ui";

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <section className={cn("overflow-hidden", ui.feedCard)}>
        <div className={cn(ui.profileCover, "animate-pulse bg-surface-muted")} />
        <div className="px-4 pb-5 pt-20 sm:px-6 sm:pt-24">
          <div className="h-8 w-48 animate-pulse rounded-md bg-surface-muted" />
          <div className="mt-2 h-4 w-32 animate-pulse rounded-md bg-surface-muted" />
        </div>
      </section>
      <div className={cn(ui.cardPadded, "animate-pulse")}>
        <div className="h-11 rounded-full bg-surface-muted" />
      </div>
      <div className={cn(ui.skeletonCard, "space-y-3")}>
        <div className="flex gap-2">
          <div className="h-10 w-10 rounded-full bg-surface-muted" />
          <div className="h-4 flex-1 rounded bg-surface-muted" />
        </div>
        <div className="h-24 rounded-lg bg-surface-muted" />
      </div>
    </div>
  );
}
