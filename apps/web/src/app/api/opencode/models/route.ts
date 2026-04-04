import { proxyChorusJson } from "@/lib/chorus-serve";

export async function POST(request: Request) {
  const body = await request.json();

  return proxyChorusJson("/opencode/models", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
