/**
 * Parse URLs in text and create clickable links
 * Converts: "Check this out: https://example.com"
 * To: "Check this out: <a href="https://example.com">https://example.com</a>"
 */

export interface TextNode {
  type: 'text' | 'link';
  content: string;
  href?: string;
}

/**
 * Parse text content and identify URLs
 */
export function parseTextWithLinks(text: string): TextNode[] {
  if (!text) return [];

  // URL regex pattern - matches http://, https://, and www. URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

  const nodes: TextNode[] = [];
  let lastIndex = 0;
  let match;

  // Use exec to find all matches
  urlRegex.lastIndex = 0;
  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      nodes.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }

    // Add the URL as a link
    let url = match[0];
    // Ensure URL has protocol
    if (url.startsWith('www.')) {
      url = 'https://' + url;
    }

    nodes.push({
      type: 'link',
      content: match[0],
      href: url,
    });

    lastIndex = urlRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  // If no URLs found, return single text node
  if (nodes.length === 0) {
    return [{
      type: 'text',
      content: text,
    }];
  }

  return nodes;
}

/**
 * React component to render text with clickable links
 */
export function TextWithLinks({ content }: { content: string }) {
  const nodes = parseTextWithLinks(content);

  return (
    <>
      {nodes.map((node, idx) => {
        if (node.type === 'link') {
          return (
            <a
              key={idx}
              href={node.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-400 hover:text-blue-300 transition-colors break-all"
              title="Open in new window"
            >
              {node.content}
            </a>
          );
        }
        return <span key={idx}>{node.content}</span>;
      })}
    </>
  );
}
