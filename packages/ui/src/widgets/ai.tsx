import { Bot, ExternalLink } from "lucide-react";
import { messageOf, useDock } from "../store/dockStore";
import { Note } from "./ui";

// ---- AI providers: plain shortcuts, no accounts, no network from the dock
const PROVIDERS = [
  ["Claude", "https://claude.ai/"],
  ["ChatGPT", "https://chatgpt.com/"],
  ["Gemini", "https://gemini.google.com/"],
  ["Copilot", "https://copilot.microsoft.com/"],
  ["Perplexity", "https://www.perplexity.ai/"],
] as const;

export const AiFace = () => <Bot size={24} />;

export function AiPanel() {
  const platform = useDock((s) => s.platform)!;
  const report = useDock((s) => s.report);
  return (
    <ul className="space-y-1 text-sm">
      {PROVIDERS.map(([name, url]) => (
        <li key={name}>
          <button
            onClick={() => platform.launch({ type: "url", url }).catch((e) => report(messageOf(e)))}
            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-white/15"
          >
            {name}
            <ExternalLink size={14} className="opacity-60" />
          </button>
        </li>
      ))}
      <Note>Opens the provider's website in your browser.</Note>
    </ul>
  );
}
