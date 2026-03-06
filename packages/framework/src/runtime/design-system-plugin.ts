import type { Plugin } from "vite";

// Tailwind color names that produce hardcoded (non-semantic) classes.
const DS_HARDCODED_COLORS = [
  "slate","gray","zinc","neutral","stone",
  "red","orange","amber","yellow","lime",
  "green","emerald","teal","cyan","sky",
  "blue","indigo","violet","purple","fuchsia",
  "pink","rose",
];
const DS_COLOR_PREFIXES = ["bg","text","border","ring","fill","stroke","outline","decoration","from","via","to"];
const DS_HARDCODED_RE = new RegExp(
  `\\b(?:${DS_COLOR_PREFIXES.join("|")})-(?:${DS_HARDCODED_COLORS.join("|")})-(?:\\d+|\\[.+?\\])\\b`
);
const DS_BARE_RE = /\b(?:bg|text|border|ring)-(?:white|black)\b/;
// Catches arbitrary hex/rgb values: bg-[#fff], text-[rgb(255,0,0)], border-[hsl(0,0%,0%)]
const DS_ARBITRARY_RE = /\b(?:bg|text|border|ring|fill|stroke)-\[(?:#[0-9a-fA-F]{3,8}|rgba?|hsl)/;

function isHardcodedColor(cls: string): boolean {
  const base = cls.replace(/^(?:[a-zA-Z0-9_-]+:)+/, ""); // strip variant prefixes
  return DS_HARDCODED_RE.test(base) || DS_BARE_RE.test(base) || DS_ARBITRARY_RE.test(base);
}

/** Dev-time warning + build-time error for hardcoded Tailwind color classes in JSX/TSX files. */
export function designSystemPlugin(): Plugin {
  let isBuild = false;
  return {
    name: "fabrk:design-system",
    enforce: "pre",

    configResolved(config) {
      isBuild = config.command === "build";
    },

    transform(code: string, id: string) {
      if (!/\.(tsx|jsx)$/.test(id)) return null;
      if (id.includes("node_modules")) return null;

      const classNameMatches = code.matchAll(/className\s*=\s*["'`]([^"'`]+)["'`]/g);
      for (const match of classNameMatches) {
        const violating = match[1].split(/\s+/).filter(isHardcodedColor);
        if (violating.length === 0) continue;

        const file = id.replace(process.cwd() + "/", "");
        const msg =
          `[fabrk] Design system violation in ${file}: ` +
          `hardcoded color class(es) "${violating.join(" ")}" — use semantic tokens ` +
          `(bg-primary, text-foreground, border-border, etc.)`;

        if (isBuild) {
          this.error(msg);
        } else {
          console.warn(msg);
        }
      }
      return null;
    },
  };
}
