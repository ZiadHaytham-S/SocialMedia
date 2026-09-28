import { Skeleton } from "@/components/ui/skeleton";
import { ui } from "@/lib/theme/ui";

export function FeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <article className={ui.feedCard} key={index}>
          <div className="flex items-center gap-2 px-4 py-3.5">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="space-y-2 px-4 pb-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Skeleton className="h-52 w-full" />
          <div className="border-t border-border-light p-4">
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </article>
      ))}
    </>
  );
}
