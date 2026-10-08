import { canvasToBlob } from "./images";

/**
 * The before-and-after picture people actually send each other (§10).
 *
 * The original room and the visualised one in a single image, labelled, with
 * the product named underneath — so it still makes sense forwarded three times
 * on WhatsApp with no link attached.
 */

const MAX_OUTPUT_SIDE = 2400;
const GAP_SHARE = 0.012;

export async function beforeAfterImage({
  before,
  after,
  title,
  subtitle,
}: {
  before: CanvasImageSource & { naturalWidth?: number; width?: number };
  after: HTMLCanvasElement;
  title: string;
  subtitle?: string | null;
}): Promise<Blob | null> {
  const width = after.width;
  const height = after.height;

  if (width === 0 || height === 0) return null;

  // Landscape rooms stack, portrait rooms sit side by side: either way the
  // result is close to square, which is what a phone and a chat thread show
  // best.
  const stacked = width >= height;
  const panelsWidth = stacked ? width : width * 2;
  const panelsHeight = stacked ? height * 2 : height;
  const scale = Math.min(1, MAX_OUTPUT_SIDE / Math.max(panelsWidth, panelsHeight));

  const panelW = Math.round(width * scale);
  const panelH = Math.round(height * scale);
  const gap = Math.round(Math.max(panelW, panelH) * GAP_SHARE);
  const footer = Math.round(Math.max(64, panelW * (stacked ? 0.11 : 0.07)));

  const canvas = document.createElement("canvas");
  canvas.width = stacked ? panelW : panelW * 2 + gap;
  canvas.height = (stacked ? panelH * 2 + gap : panelH) + footer;

  const context = canvas.getContext("2d");

  if (!context) return null;

  context.fillStyle = "#121211";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = "high";

  const second = stacked ? { x: 0, y: panelH + gap } : { x: panelW + gap, y: 0 };

  context.drawImage(before, 0, 0, panelW, panelH);
  context.drawImage(after, second.x, second.y, panelW, panelH);

  const label = Math.round(Math.max(14, panelW * (stacked ? 0.028 : 0.032)));
  drawLabel(context, "BEFORE", 0, 0, label);
  drawLabel(context, "AFTER", second.x, second.y, label);

  const footerTop = canvas.height - footer;
  const titleSize = Math.round(footer * 0.3);
  const subtitleSize = Math.round(footer * 0.2);

  context.textBaseline = "middle";
  context.fillStyle = "#ffffff";
  context.font = `600 ${titleSize}px Montserrat, system-ui, sans-serif`;
  context.fillText(
    truncate(context, title, canvas.width * 0.62),
    footer * 0.35,
    footerTop + footer * (subtitle ? 0.38 : 0.5),
  );

  if (subtitle) {
    context.fillStyle = "rgba(255,255,255,0.65)";
    context.font = `400 ${subtitleSize}px "Nunito Sans", system-ui, sans-serif`;
    context.fillText(
      truncate(context, subtitle, canvas.width * 0.62),
      footer * 0.35,
      footerTop + footer * 0.7,
    );
  }

  context.textAlign = "right";
  context.fillStyle = "#c9a95c";
  context.font = `600 ${subtitleSize}px Montserrat, system-ui, sans-serif`;
  context.fillText("FLOOR NIGERIA", canvas.width - footer * 0.35, footerTop + footer * 0.5);

  return canvasToBlob(canvas, "image/jpeg", 0.9);
}

function drawLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
): void {
  context.save();
  context.font = `600 ${size}px Montserrat, system-ui, sans-serif`;
  const padding = size * 0.6;
  const width = context.measureText(text).width + padding * 2;
  const height = size + padding;

  context.fillStyle = "rgba(18, 18, 17, 0.78)";
  context.fillRect(x + padding, y + padding, width, height);
  context.fillStyle = "#ffffff";
  context.textBaseline = "middle";
  context.fillText(text, x + padding * 2, y + padding + height / 2);
  context.restore();
}

function truncate(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text;

  let end = text.length;
  while (end > 1 && context.measureText(`${text.slice(0, end)}…`).width > maxWidth) end--;

  return `${text.slice(0, end)}…`;
}
