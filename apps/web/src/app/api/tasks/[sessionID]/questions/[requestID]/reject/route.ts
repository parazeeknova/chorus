import { proxyChorusJson } from "@/lib/chorus-serve";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionID: string; requestID: string }> }
) {
  const { sessionID, requestID } = await params;

  return proxyChorusJson(`/tasks/${sessionID}/questions/${requestID}/reject`, {
    method: "POST",
  });
}
