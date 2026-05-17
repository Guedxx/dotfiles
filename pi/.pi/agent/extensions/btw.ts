import { complete, type UserMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { BorderedLoader, DynamicBorder, getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Container, Markdown, matchesKey, Text } from "@earendil-works/pi-tui";

type ContentBlock = {
	type?: string;
	text?: string;
	name?: string;
	arguments?: Record<string, unknown>;
};

type SessionEntry = {
	type: string;
	message?: {
		role?: string;
		content?: unknown;
		toolName?: string;
		isError?: boolean;
	};
};

const MAX_CONTEXT_CHARS = 180_000;

const textFromContent = (content: unknown): string[] => {
	if (typeof content === "string") return [content];
	if (!Array.isArray(content)) return [];

	const parts: string[] = [];
	for (const item of content) {
		if (!item || typeof item !== "object") continue;
		const block = item as ContentBlock;
		if (block.type === "text" && typeof block.text === "string") {
			parts.push(block.text);
		}
	}
	return parts;
};

const toolCallsFromContent = (content: unknown): string[] => {
	if (!Array.isArray(content)) return [];

	const calls: string[] = [];
	for (const item of content) {
		if (!item || typeof item !== "object") continue;
		const block = item as ContentBlock;
		if (block.type !== "toolCall" || typeof block.name !== "string") continue;
		calls.push(`Assistant called tool ${block.name} with arguments ${JSON.stringify(block.arguments ?? {})}`);
	}
	return calls;
};

const truncateMiddle = (text: string, maxChars: number): string => {
	if (text.length <= maxChars) return text;
	const keepStart = Math.floor(maxChars * 0.2);
	const keepEnd = maxChars - keepStart;
	return [
		text.slice(0, keepStart),
		`\n\n[... ${text.length - maxChars} characters omitted from older middle context for /btw ...]\n\n`,
		text.slice(text.length - keepEnd),
	].join("");
};

const buildConversationContext = (ctx: ExtensionCommandContext): string => {
	const sections: string[] = [];

	const systemPrompt = ctx.getSystemPrompt();
	if (systemPrompt.trim()) {
		sections.push(`Current session/system/project instructions:\n${systemPrompt.trim()}`);
	}

	for (const entry of ctx.sessionManager.getBranch() as SessionEntry[]) {
		if (entry.type !== "message" || !entry.message?.role) continue;

		const role = entry.message.role;
		const lines: string[] = [];

		if (role === "user") {
			const text = textFromContent(entry.message.content).join("\n").trim();
			if (text) lines.push(`User: ${text}`);
		} else if (role === "assistant") {
			const text = textFromContent(entry.message.content).join("\n").trim();
			if (text) lines.push(`Assistant: ${text}`);
			lines.push(...toolCallsFromContent(entry.message.content));
		} else if (role === "toolResult") {
			const text = textFromContent(entry.message.content).join("\n").trim();
			if (text) {
				const label = entry.message.toolName ? `Tool result (${entry.message.toolName})` : "Tool result";
				lines.push(`${label}${entry.message.isError ? " [error]" : ""}: ${text}`);
			}
		}

		if (lines.length > 0) sections.push(lines.join("\n"));
	}

	return truncateMiddle(sections.join("\n\n"), MAX_CONTEXT_CHARS);
};

const buildQuestionPrompt = (question: string, context: string): string =>
	[
		"Answer this /btw side question using only the current pi session context below.",
		"Do not use or claim to use tools. Do not invent missing facts; if the context does not contain the answer, say so briefly.",
		"Keep the answer concise unless the user explicitly asks for detail.",
		"",
		"<current-session-context>",
		context,
		"</current-session-context>",
		"",
		"Side question:",
		question,
	].join("\n");

const askSideQuestion = async (
	question: string,
	ctx: ExtensionCommandContext,
	signal?: AbortSignal,
): Promise<string | null> => {
	if (!ctx.model) throw new Error("No model selected");

	const context = buildConversationContext(ctx);
	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(ctx.model);
	if (!auth.ok || !auth.apiKey) {
		throw new Error(auth.ok ? `No API key for ${ctx.model.provider}` : auth.error);
	}

	const message: UserMessage = {
		role: "user",
		content: [{ type: "text", text: buildQuestionPrompt(question, context) }],
		timestamp: Date.now(),
	};

	const response = await complete(
		ctx.model,
		{
			systemPrompt:
				"You answer ephemeral /btw side questions inside pi. You have no tool access. Answer only from the supplied current-session context.",
			messages: [message],
		},
		{
			apiKey: auth.apiKey,
			headers: auth.headers,
			reasoningEffort: "low",
			signal,
		},
	);

	if (response.stopReason === "aborted") return null;

	return response.content
		.filter((c): c is { type: "text"; text: string } => c.type === "text")
		.map((c) => c.text)
		.join("\n")
		.trim();
};

const showAnswer = async (question: string, answer: string, ctx: ExtensionCommandContext) => {
	await ctx.ui.custom<void>(
		(_tui, theme, _kb, done) => {
			const container = new Container();
			const border = new DynamicBorder((s: string) => theme.fg("accent", s));
			const mdTheme = getMarkdownTheme();

			container.addChild(border);
			container.addChild(new Text(theme.fg("accent", theme.bold("/btw")) + theme.fg("dim", ` ${question}`), 1, 0));
			container.addChild(new Markdown(answer || "(no answer)", 1, 1, mdTheme));
			container.addChild(new Text(theme.fg("dim", "Press Space, Enter, or Esc to close"), 1, 0));
			container.addChild(border);

			return {
				render: (width: number) => container.render(width),
				invalidate: () => container.invalidate(),
				handleInput: (data: string) => {
					if (matchesKey(data, "space") || matchesKey(data, "enter") || matchesKey(data, "escape")) {
						done(undefined);
						return true;
					}
					return true;
				},
			};
		},
		{ overlay: true, overlayOptions: { anchor: "center", width: "80%", margin: 2 } },
	);
};

export default function (pi: ExtensionAPI) {
	pi.registerCommand("btw", {
		description: "Ask an ephemeral side question about the current session without adding it to history",
		handler: async (args, ctx) => {
			const question = args.trim();
			if (!question) {
				ctx.ui.notify("Usage: /btw <question>", "warning");
				return;
			}

			if (!ctx.hasUI) {
				ctx.ui.notify("/btw requires interactive mode", "error");
				return;
			}

			let answer: string | null = null;
			try {
				answer = await ctx.ui.custom<string | null>(
					(tui, theme, _kb, done) => {
						const loader = new BorderedLoader(tui, theme, `Answering /btw using ${ctx.model?.id ?? "current model"}...`);
						loader.onAbort = () => done(null);

						askSideQuestion(question, ctx, loader.signal)
							.then(done)
							.catch((error) => {
								ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
								done(null);
							});

						return loader;
					},
					{ overlay: true, overlayOptions: { anchor: "center", width: "60%", margin: 2 } },
				);
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
				return;
			}

			if (answer === null) {
				ctx.ui.notify("/btw cancelled", "info");
				return;
			}

			await showAnswer(question, answer, ctx);
		},
	});
}
