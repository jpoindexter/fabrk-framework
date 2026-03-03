import { buildSecurityHeaders } from "../middleware/security";

export interface OGFont {
  name: string;
  data: ArrayBuffer;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style?: "normal" | "italic";
}

export interface OGTemplateOptions {
  width?: number;
  height?: number;
  render: (params: Record<string, string>) => React.ReactNode;
  fonts?: OGFont[];
}

export interface OGTemplate {
  width: number;
  height: number;
  render: (params: Record<string, string>) => React.ReactNode;
  fonts: OGFont[];
}

export function defineOGTemplate(options: OGTemplateOptions): OGTemplate {
  return {
    width: options.width ?? 1200,
    height: options.height ?? 630,
    render: options.render,
    fonts: options.fonts ?? [],
  };
}

type SatoriModule = {
  default: (
    element: React.ReactNode,
    options: { width: number; height: number; fonts: OGFont[] },
  ) => Promise<string>;
};

type ResvgModule = {
  Resvg: new (svg: string, options?: Record<string, unknown>) => {
    render: () => { asPng: () => Uint8Array };
  };
};

let satoriMod: SatoriModule | null | false = null;
let resvgMod: ResvgModule | null | false = null;

async function loadSatori(): Promise<SatoriModule | null> {
  if (satoriMod === false) return null;
  if (satoriMod) return satoriMod;
  try {
    const mod = await (Function('return import("satori")')() as Promise<SatoriModule>);
    satoriMod = mod;
    return satoriMod;
  } catch {
    satoriMod = false;
    return null;
  }
}

async function loadResvg(): Promise<ResvgModule | null> {
  if (resvgMod === false) return null;
  if (resvgMod) return resvgMod;
  try {
    const mod = await (Function('return import("@resvg/resvg-js")')() as Promise<ResvgModule>);
    resvgMod = mod;
    return resvgMod;
  } catch {
    resvgMod = false;
    return null;
  }
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...buildSecurityHeaders() },
  });
}

export async function handleOGRequest(
  request: Request,
  templates: Map<string, OGTemplate>,
): Promise<Response> {
  const url = new URL(request.url, "http://localhost");
  const templateName = url.searchParams.get("template");

  if (!templateName) {
    return jsonError("Missing template parameter", 400);
  }

  const template = templates.get(templateName);
  if (!template) {
    return jsonError(`Template "${templateName}" not found`, 404);
  }

  const [satori, resvg] = await Promise.all([loadSatori(), loadResvg()]);

  if (!satori || !resvg) {
    return jsonError(
      "OG image generation requires satori and @resvg/resvg-js — install them as dependencies",
      501,
    );
  }

  const params: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== "template") params[key] = value;
  }

  try {
    const element = template.render(params);
    const svg = await satori.default(element, {
      width: template.width,
      height: template.height,
      fonts: template.fonts,
    });

    const renderer = new resvg.Resvg(svg, {
      fitTo: { mode: "width" as const, value: template.width },
    });
    const png = renderer.render().asPng();
    const buffer = new Uint8Array(png).buffer as ArrayBuffer;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
        "Content-Length": String(png.length),
        ...buildSecurityHeaders(),
      },
    });
  } catch (err) {
    console.error("[fabrk] OG image generation error:", err);
    return jsonError("OG image generation failed", 500);
  }
}

export function isOGRequest(pathname: string): boolean {
  return pathname === "/_fabrk/og";
}
