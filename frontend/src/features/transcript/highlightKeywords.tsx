import type { ReactNode } from "react";

export function highlightKeywords(text: string, keywords: string[]): ReactNode {
  if (keywords.length === 0) return text;

  const pattern = new RegExp(`(${keywords.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const isMatch = keywords.some((keyword) => keyword.toLowerCase() === part.toLowerCase());
    if (!isMatch) return part;

    return (
      <mark key={`${part}-${index}`} className="rounded-sm bg-danger/20 px-0.5 text-danger">
        {part}
      </mark>
    );
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
