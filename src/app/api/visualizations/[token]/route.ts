import { NextResponse } from "next/server";
import { getVisualization } from "@/lib/api/visualizations";

/**
 * A saved design, for reopening it in the studio (`/visualizer?design=…`).
 *
 * The share token is the capability, exactly as for the shared page; this only
 * hands the browser the room photo, the material and the placement so the
 * design can be edited rather than just looked at.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!/^[A-Za-z0-9_-]{8,80}$/.test(token)) {
    return NextResponse.json({ message: "That design link is not valid." }, { status: 404 });
  }

  try {
    const visualization = await getVisualization(token);

    if (!visualization) {
      return NextResponse.json({ message: "That design no longer exists." }, { status: 404 });
    }

    return NextResponse.json(
      { data: visualization },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("[visualizations:show]", error);
    return NextResponse.json({ message: "Designs are unavailable right now." }, { status: 502 });
  }
}
