import { PanelSkeleton, Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Skeleton className="mb-2 h-8 w-56" />
      <Skeleton className="mb-6 h-4 w-80 max-w-full" />
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <PanelSkeleton rows={5} />
        <PanelSkeleton rows={3} />
      </div>
    </div>
  );
}
