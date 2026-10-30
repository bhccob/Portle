import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Moves every heading one level down, for Markdown that sits under a page's own h1. */
const DEMOTED = {
  h1: ({ children }: { children?: React.ReactNode }) => <h2>{children}</h2>,
  h2: ({ children }: { children?: React.ReactNode }) => <h3>{children}</h3>,
  h3: ({ children }: { children?: React.ReactNode }) => <h4>{children}</h4>,
  h4: ({ children }: { children?: React.ReactNode }) => <h5>{children}</h5>,
  h5: ({ children }: { children?: React.ReactNode }) => <h6>{children}</h6>,
};

/**
 * Renders member-written Markdown safely: raw HTML is not rendered (react-markdown
 * ignores it by default), pictures are dropped, and links open as plain, no-referrer,
 * external links. `demoteHeadings` keeps a member's "# Title" below the page's own h1.
 */
export function Markdown({ children, className, demoteHeadings }: { children: string; className?: string; demoteHeadings?: boolean }) {
  return (
    <div className={className ?? "prose-archive text-[0.9375rem] text-fg"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={(url) => (/^(https?:|mailto:|\/)/i.test(url) ? url : "")}
        components={{
          ...(demoteHeadings ? DEMOTED : {}),
          a: ({ href, children }) => (
            <a href={href} rel="noopener noreferrer nofollow" target={href?.startsWith("/") ? undefined : "_blank"}>
              {children}
            </a>
          ),
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
