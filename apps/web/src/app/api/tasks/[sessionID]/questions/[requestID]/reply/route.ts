import { proxyChorusJson } from "@/lib/chorus-serve";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionID: string; requestID: string }> }
) {
  const { sessionID, requestID } = await params;
  const body = await request.json();

  return proxyChorusJson(`/tasks/${sessionID}/questions/${requestID}/reply`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
