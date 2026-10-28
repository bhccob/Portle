import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders member-written Markdown safely: raw HTML is not rendered (react-markdown
 * ignores it by default) and links open as plain, no-referrer, external links.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={className ?? "prose-archive text-[0.9375rem] text-fg"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={(url) => (/^(https?:|mailto:|\/)/i.test(url) ? url : "")}
        components={{
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
