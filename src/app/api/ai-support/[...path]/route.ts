import { NextResponse, type NextRequest } from "next/server";
import { rawApiFetch } from "@/lib/api/client";
import { getToken, getClientIp } from "@/lib/api/auth";

/**
 * Proxy public AI support chat requests to Laravel.
 *
 * These endpoints support both authenticated users (via cookie token)
 * and anonymous visitors (via visitor_session_id in the body or the
 * X-Visitor-Session header).
 */

type Params = { params: Promise<{ path: string[] }> };

const SEGMENT = /^[a-z0-9_-]{1,100}$/i;
const CONVERSATION_ULID = /^[0-9a-z]{26}$/i;
const CONVERSATION_ACTIONS = new Set(["messages", "stream", "escalate", "lead"]);

export const GET = forward;
export const POST = forward;

/**
 * Only the routes this widget actually uses may be proxied. Anything else is
 * a 404 rather than an open pass-through to the Laravel API.
 */
function isAllowedPath(path: string[]): boolean {
  if (path.length === 0 || !path.every((segment) => SEGMENT.test(segment))) {
    return false;
  }

  const [root, ...rest] = path;

  switch (root) {
    case "widget-config":
    case "health":
    case "calculate":
    case "floor-finder":
    case "transcribe":
      return rest.length === 0;

    case "search":
      return rest.length === 1 && rest[0] === "interpret";

    case "conversations":
      if (rest.length === 0) return true;

      return (
        rest.length === 2 && CONVERSATION_ULID.test(rest[0]) && CONVERSATION_ACTIONS.has(rest[1])
      );

    default:
      return false;
  }
}

async function forward(request: NextRequest, { params }: Params) {
  const { path } = await params;

  if (!isAllowedPath(path)) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  const method = request.method.toUpperCase();
  const token = await getToken();
  const clientIp = await getClientIp();
  const visitor = request.headers.get("x-visitor-session");

  let body: BodyInit | undefined;
  const headers: Record<string, string> = {};

  if (method !== "GET") {
    body = await request.text();
    headers["Content-Type"] = "application/json";
  }

  // Forward the anonymous session so Laravel can authorize the conversation.
  if (visitor) {
    headers["X-Visitor-Session"] = visitor;
  }

  try {
    const upstream = await rawApiFetch(
      `/v1/ai-support/${path.join("/")}${request.nextUrl.search}`,
      {
        method,
        body,
        headers,
        token: token ?? "",
        clientIp,
      },
    );

    const contentType = upstream.headers.get("content-type") ?? "";

    // SSE streams pass through directly.
    if (contentType.includes("text/event-stream")) {
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const payload = await upstream.json().catch(() => ({
      message: "Unexpected response.",
    }));

    return NextResponse.json(payload, {
      status: upstream.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("[ai-support:proxy]", error);
    return NextResponse.json({ message: "AI support is unavailable right now." }, { status: 502 });
  }
}
