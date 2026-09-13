function escapeHtml(text: string): string {
  return text.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}

/**
 * Minimal TypeScript highlighter for our own engine sources. Colors follow
 * DESIGN.md §8: keywords text-ink medium, strings viz-2, numbers accent,
 * comments ink-tertiary. Output is pre-escaped HTML.
 */
export function highlightTypeScript(source: string): string {
  const pattern =
    /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(const|let|var|function|return|if|else|for|while|do|of|in|new|class|extends|implements|private|protected|public|readonly|import|from|export|type|interface|abstract|switch|case|break|continue|default|void|null|undefined|true|false|this|super|static|as|throw|try|catch|typeof|instanceof|yield)\b|(\b0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)/g;
  let out = "";
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    out += escapeHtml(source.slice(last, match.index));
    const [full, comment, str, keyword, num] = match;
    const cls = comment
      ? "text-ink-tertiary"
      : str
        ? "text-viz-2"
        : keyword
          ? "text-ink font-medium"
          : num
            ? "text-accent"
            : "";
    out += `<span class="${cls}">${escapeHtml(full)}</span>`;
    last = match.index + full.length;
  }
  out += escapeHtml(source.slice(last));
  return out;
}
