import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Markdown } from "@earendil-works/pi-tui";

const PATCH_KEY = Symbol.for("xigo.pi.pretty-markdown-codeblocks");

type CodeToken = {
	type: string;
	text?: string;
	lang?: string;
};

type MarkdownLike = {
	theme: {
		codeBlockBorder: (text: string) => string;
		codeBlock: (text: string) => string;
		codeBlockIndent?: string;
		highlightCode?: (code: string, lang?: string) => string[];
	};
};

function renderPrettyCodeBlock(instance: MarkdownLike, token: CodeToken, nextTokenType?: string): string[] {
	const code = token.text ?? "";
	const lang = token.lang?.trim();
	const indent = instance.theme.codeBlockIndent ?? "  ";
	const highlightedLines = instance.theme.highlightCode
		? instance.theme.highlightCode(code, lang)
		: code.split("\n").map((line) => instance.theme.codeBlock(line));

	const lines = [instance.theme.codeBlockBorder(lang ? `╭─ ${lang}` : "╭─")];
	for (const line of highlightedLines) {
		lines.push(`${indent}${line}`);
	}
	lines.push(instance.theme.codeBlockBorder("╰─"));

	if (nextTokenType && nextTokenType !== "space") {
		lines.push("");
	}

	return lines;
}

function patchMarkdownCodeBlocks(): void {
	const proto = Markdown.prototype as unknown as Record<PropertyKey, unknown>;
	if (proto[PATCH_KEY]) return;

	const originalRenderToken = proto.renderToken;
	if (typeof originalRenderToken !== "function") return;

	Object.defineProperty(proto, PATCH_KEY, {
		value: true,
		configurable: false,
		enumerable: false,
	});

	proto.renderToken = function patchedRenderToken(
		this: MarkdownLike,
		token: CodeToken,
		width: number,
		nextTokenType?: string,
		styleContext?: unknown,
	) {
		if (token?.type === "code") {
			return renderPrettyCodeBlock(this, token, nextTokenType);
		}

		return originalRenderToken.call(this, token, width, nextTokenType, styleContext);
	};
}

export default function prettyMarkdownCodeBlocks(_pi: ExtensionAPI) {
	patchMarkdownCodeBlocks();
}
