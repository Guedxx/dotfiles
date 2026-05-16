import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { VERSION } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		if (!ctx.hasUI) return;

		ctx.ui.setHeader((_tui, theme) => {
			const header = `${theme.bold(theme.fg("accent", "pi"))}${theme.fg("dim", ` v${VERSION}`)}`;
			return new Text(header, 1, 0);
		});
	});
}
