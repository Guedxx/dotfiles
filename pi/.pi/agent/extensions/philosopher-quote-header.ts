import type { Component } from "@earendil-works/pi-tui";
import { visibleWidth } from "@earendil-works/pi-tui";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const QUOTES = [
  ["The unexamined life is not worth living.", "Socrates"],
  ["No great mind has ever existed without a touch of madness.", "Aristotle"],
  ["He who has a why to live can bear almost any how.", "Friedrich Nietzsche"],
  ["The happiness of your life depends upon the quality of your thoughts.", "Marcus Aurelius"],
  ["Man is condemned to be free.", "Jean-Paul Sartre"],
  ["One cannot step twice in the same river.", "Heraclitus"],
  ["We are what we repeatedly do.", "Aristotle"],
  ["Life must be understood backward. But it must be lived forward.", "Søren Kierkegaard"],
];

function padToWidth(line: string, width: number): string {
  return line + " ".repeat(Math.max(0, width - visibleWidth(line)));
}

function center(line: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - visibleWidth(line)) / 2));
  return padToWidth(" ".repeat(pad) + line, width);
}

class PhilosopherQuoteHeader implements Component {
  private readonly quote: string;
  constructor(private readonly theme: any) {
    const [text, author] = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    this.quote = `“${text}” — ${author}`;
  }

  render(width: number): string[] {
    const quote = this.theme.fg("muted", this.quote);

    return [
      " ".repeat(width),
      center(quote, width),
      " ".repeat(width),
    ];
  }
}

export default function philosopherQuoteHeader(pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setHeader((_tui, theme) => new PhilosopherQuoteHeader(theme));
  });
}
