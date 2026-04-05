import { proxyChorusJson } from "@/lib/chorus-serve";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionID: string }> }
) {
  const { sessionID } = await params;
  const body = await request.json();

  return proxyChorusJson(`/tasks/${sessionID}/finalize-review`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
