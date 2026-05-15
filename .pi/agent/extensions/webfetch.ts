import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;
const DEFAULT_TIMEOUT_SECONDS = 30;
const MAX_TIMEOUT_SECONDS = 120;

type WebFetchFormat = "text" | "markdown" | "html";

interface WebFetchDetails {
	url: string;
	finalUrl: string;
	format: WebFetchFormat;
	status: number;
	statusText: string;
	contentType: string;
	bytesRead: number;
	timeout: number;
	isImage: boolean;
}

function clampTimeout(value: unknown): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_TIMEOUT_SECONDS;
	return Math.min(MAX_TIMEOUT_SECONDS, Math.max(1, Math.floor(value)));
}

function acceptHeaderFor(format: WebFetchFormat): string {
	switch (format) {
		case "markdown":
			return "text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1";
		case "text":
			return "text/plain;q=1.0, text/markdown;q=0.9, text/html;q=0.8, */*;q=0.1";
		case "html":
			return "text/html;q=1.0, application/xhtml+xml;q=0.9, text/plain;q=0.8, text/markdown;q=0.7, */*;q=0.1";
	}
}

function decodeHtmlEntities(value: string): string {
	return value
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;|&apos;/gi, "'")
		.replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
		.replace(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)));
}

function stripSkippedHtml(html: string): string {
	return html
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
		.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
		.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
		.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, " ")
		.replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, " ")
		.replace(/<embed\b[^>]*>[\s\S]*?<\/embed>/gi, " ")
		.replace(/<!--([\s\S]*?)-->/g, " ")
		.replace(/<meta\b[^>]*>/gi, " ")
		.replace(/<link\b[^>]*>/gi, " ");
}

function normalizeText(value: string): string {
	return value
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n[ \t]+/g, "\n")
		.replace(/[ \t]{2,}/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function attributeValue(tag: string, name: string): string | undefined {
	const pattern = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
	const match = tag.match(pattern);
	return match?.[1] ?? match?.[2] ?? match?.[3];
}

function stripTags(value: string): string {
	return decodeHtmlEntities(value.replace(/<[^>]+>/g, " "));
}

function extractTextFromHTML(html: string): string {
	return normalizeText(
		decodeHtmlEntities(
			stripSkippedHtml(html)
				.replace(/<br\s*\/?>/gi, "\n")
				.replace(/<\/\s*(p|div|section|article|header|footer|li|h[1-6]|tr|blockquote)>/gi, "\n")
				.replace(/<[^>]+>/g, " "),
		),
	);
}

function convertHTMLToMarkdown(html: string): string {
	let markdown = stripSkippedHtml(html);

	markdown = markdown.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_match, code: string) => `\n\n\`\`\`\n${stripTags(code).trim()}\n\`\`\`\n\n`);
	markdown = markdown.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_match, code: string) => `\`${stripTags(code).trim()}\``);
	markdown = markdown.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_match, level: string, text: string) => `\n\n${"#".repeat(Number(level))} ${stripTags(text).trim()}\n\n`);
	markdown = markdown.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (match: string, attrs: string, text: string) => {
		const label = stripTags(text).trim();
		const href = attributeValue(attrs, "href");
		if (!label || !href) return label || match;
		return `[${label}](${decodeHtmlEntities(href)})`;
	});
	markdown = markdown.replace(/<img\b([^>]*)>/gi, (_match, attrs: string) => {
		const src = attributeValue(attrs, "src");
		if (!src) return "";
		const alt = attributeValue(attrs, "alt") ?? "";
		return `![${decodeHtmlEntities(alt)}](${decodeHtmlEntities(src)})`;
	});
	markdown = markdown.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_match, _tag: string, text: string) => `**${stripTags(text).trim()}**`);
	markdown = markdown.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_match, _tag: string, text: string) => `*${stripTags(text).trim()}*`);
	markdown = markdown.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_match, text: string) => `\n- ${stripTags(text).trim()}`);
	markdown = markdown.replace(/<br\s*\/?>/gi, "\n");
	markdown = markdown.replace(/<\/\s*(p|div|section|article|header|footer|ul|ol|blockquote|table|tr)>/gi, "\n\n");
	markdown = markdown.replace(/<[^>]+>/g, " ");

	return normalizeText(decodeHtmlEntities(markdown));
}

function isHtmlResponse(contentType: string, content: string): boolean {
	return /\bhtml\b/i.test(contentType) || /<!doctype html|<html[\s>]/i.test(content.slice(0, 500));
}

function isImageAttachment(mime: string): boolean {
	return mime.startsWith("image/") && mime !== "image/svg+xml";
}

function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return "unknown size";
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KB", "MB", "GB"];
	let value = bytes / 1024;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex++;
	}
	return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)} ${units[unitIndex]}`;
}

function resultTextLength(result: { content?: Array<{ type: string; text?: string }> }): number | undefined {
	const text = result.content
		?.filter((item) => item.type === "text" && typeof item.text === "string")
		.map((item) => item.text)
		.join("\n");
	return text === undefined ? undefined : text.length;
}

function estimateTextTokens(chars: number): number {
	return Math.ceil(chars / 4);
}

async function readLimited(response: Response, maxBytes: number): Promise<Uint8Array> {
	const contentLength = response.headers.get("content-length");
	if (contentLength && Number.parseInt(contentLength, 10) > maxBytes) {
		throw new Error("Response too large (exceeds 5MB limit)");
	}

	if (!response.body) {
		const buffer = Buffer.from(await response.arrayBuffer());
		if (buffer.byteLength > maxBytes) throw new Error("Response too large (exceeds 5MB limit)");
		return buffer;
	}

	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let bytesRead = 0;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (!value) continue;

		bytesRead += value.byteLength;
		if (bytesRead > maxBytes) {
			await reader.cancel().catch(() => undefined);
			throw new Error("Response too large (exceeds 5MB limit)");
		}

		chunks.push(value);
	}

	return Buffer.concat(chunks, bytesRead);
}

async function fetchWithRetry(url: string, headers: Record<string, string>, signal: AbortSignal): Promise<Response> {
	const response = await fetch(url, { headers, redirect: "follow", signal });
	if (response.status !== 403 || response.headers.get("cf-mitigated") !== "challenge") return response;

	await response.body?.cancel().catch(() => undefined);
	return fetch(url, {
		headers: { ...headers, "User-Agent": "opencode" },
		redirect: "follow",
		signal,
	});
}

export default function webfetchExtension(pi: ExtensionAPI) {
	pi.registerTool({
		name: "webfetch",
		label: "Webfetch",
		description: [
			"Fetches content from a specified URL.",
			"Takes a URL and optional format as input.",
			"Fetches the URL content, converts to requested format (markdown by default).",
			"Returns the content in the specified format.",
			"Use this tool when you need to retrieve and analyze web content.",
			"Usage notes: if another tool is present that offers better web fetching capabilities, is more targeted to the task, or has fewer restrictions, prefer using that tool instead of this one. The URL must be a fully-formed valid URL. Format options: markdown (default), text, or html. This tool is read-only and does not modify any files. Results may be summarized if the content is very large.",
		].join("\n"),
		promptSnippet: "Fetch content from a URL and return text, markdown, or HTML",
		promptGuidelines: [
			"Use webfetch when you need to retrieve and analyze current web content from a fully-formed HTTP or HTTPS URL.",
			"Use webfetch only for public HTTP or HTTPS URLs; webfetch is not a search engine.",
			"When calling webfetch, request markdown unless raw HTML or plain text is specifically needed.",
		],
		parameters: Type.Object({
			url: Type.String({ description: "The URL to fetch content from" }),
			format: Type.Optional(
				Type.Union([Type.Literal("text"), Type.Literal("markdown"), Type.Literal("html")], {
					description: "The format to return the content in (text, markdown, or html). Defaults to markdown.",
					default: "markdown",
				}),
			),
			timeout: Type.Optional(Type.Number({ description: "Optional timeout in seconds (max 120)" })),
		}),
		renderCall(args, theme, _context) {
			let text = theme.fg("toolTitle", theme.bold("webfetch "));
			if (args.url) text += theme.fg("accent", String(args.url));
			if (args.format) text += theme.fg("muted", ` (${args.format})`);
			return new Text(text, 0, 0);
		},
		renderResult(result, { isPartial }, theme, _context) {
			if (isPartial) return new Text(theme.fg("warning", "Fetching..."), 0, 0);

			const details = result.details as WebFetchDetails | undefined;
			if (!details) return new Text(theme.fg("success", "Fetched content (hidden from UI; available to the model)"), 0, 0);

			let text = theme.fg("success", `Fetched ${details.isImage ? "image" : details.format}`);
			text += theme.fg("muted", ` • ${details.status} ${details.statusText}`);
			text += theme.fg("muted", ` • ${formatBytes(details.bytesRead)}`);

			const chars = resultTextLength(result);
			if (chars !== undefined && !details.isImage) {
				text += theme.fg("muted", ` • ${chars.toLocaleString()} chars / ~${estimateTextTokens(chars).toLocaleString()} tokens`);
			}

			text += `\n${theme.fg("dim", details.finalUrl || details.url)}`;
			return new Text(text, 0, 0);
		},
		async execute(_toolCallId, params, signal) {
			let url: URL;
			try {
				url = new URL(params.url);
			} catch {
				throw new Error("URL must be a fully-formed valid URL");
			}

			if (url.protocol !== "http:" && url.protocol !== "https:") {
				throw new Error("URL must start with http:// or https://");
			}

			const format = (params.format ?? "markdown") as WebFetchFormat;
			const timeout = clampTimeout(params.timeout);
			const timeoutController = new AbortController();
			const timeoutId = setTimeout(() => timeoutController.abort(new Error("Request timed out")), timeout * 1000);
			const signals = signal ? [signal, timeoutController.signal] : [timeoutController.signal];
			const combinedSignal = AbortSignal.any(signals);

			try {
				const headers = {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
					"Accept": acceptHeaderFor(format),
					"Accept-Language": "en-US,en;q=0.9",
				};

				const response = await fetchWithRetry(url.toString(), headers, combinedSignal);
				if (!response.ok) {
					await response.body?.cancel().catch(() => undefined);
					throw new Error(`Request failed with status ${response.status} ${response.statusText}`);
				}

				const bytes = await readLimited(response, MAX_RESPONSE_SIZE);
				const contentType = response.headers.get("content-type") ?? "";
				const mime = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
				const details: WebFetchDetails = {
					url: url.toString(),
					finalUrl: response.url,
					format,
					status: response.status,
					statusText: response.statusText,
					contentType,
					bytesRead: bytes.byteLength,
					timeout,
					isImage: isImageAttachment(mime),
				};

				if (details.isImage) {
					return {
						content: [
							{ type: "text", text: "Image fetched successfully" },
							{ type: "image", data: Buffer.from(bytes).toString("base64"), mimeType: mime },
						],
						details,
					};
				}

				const content = new TextDecoder().decode(bytes);
				const output = isHtmlResponse(contentType, content)
					? format === "html"
						? content
						: format === "text"
							? extractTextFromHTML(content)
							: convertHTMLToMarkdown(content)
					: content;

				return {
					content: [{ type: "text", text: output }],
					details,
				};
			} catch (error) {
				if (timeoutController.signal.aborted && !signal?.aborted) {
					throw new Error("Request timed out");
				}
				throw error;
			} finally {
				clearTimeout(timeoutId);
			}
		},
	});
}
