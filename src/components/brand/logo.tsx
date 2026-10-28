import { cn } from "@/lib/cn";

/**
 * The Porfael mark: a P cut like a faceted stone, its bowl a vault with a
 * locked counter. Monochrome by default (currentColor); `facets` adds the
 * two-tone cut for brand surfaces. Legible down to 16px.
 */
export function PorfaelMark({ className, facets = true, title }: { className?: string; facets?: boolean; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("shrink-0", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M6 3h14.2L27 9.4v6.2L20.2 22H13v7.2L6 26.4V3Zm7 6.2v6.6h5.4l2.2-2.1V11.3l-2.2-2.1H13Z"
      />
      {facets ? (
        <>
          <path fill="currentColor" opacity="0.38" d="M20.2 3 27 9.4h-6.4l-2.2-2.1L20.2 3Z" />
          <path fill="currentColor" opacity="0.22" d="M13 22v7.2L6 26.4l7-4.4Z" />
          <path fill="var(--bg, #171320)" opacity="0.55" d="M15 11.6h3.2l.9.9v1.4l-.9.9H15v-3.2Z" />
        </>
      ) : null}
    </svg>
  );
}

export function PorfaelWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-[-0.02em]", className)}>
      <PorfaelMark className="size-[1.35em] text-lilac" />
      <span>Porfael</span>
    </span>
  );
}
