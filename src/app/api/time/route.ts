import { NextResponse } from "next/server";
import { headers } from "next/headers";

export const runtime = "edge";

export async function GET() {
  // 跨域保护：只允许同源请求
  const headersList = await headers();
  const origin = headersList.get("origin");
  const referer = headersList.get("referer");

  // 如果有 origin 或 referer，验证是否同源
  if (origin || referer) {
    const requestUrl = new URL(referer || origin || "");
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ].filter(Boolean);

    const isAllowed = allowedOrigins.some(
      (allowed) =>
        requestUrl.origin === allowed ||
        requestUrl.origin.startsWith("http://localhost") ||
        requestUrl.origin.startsWith("http://127.0.0.1")
    );

    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const serverTime = Date.now();

  return NextResponse.json({
    time: new Date(serverTime).toISOString(),
    timestamp: serverTime,
  });
}
