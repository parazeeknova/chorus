import { proxyChorusJson } from "@/lib/chorus-serve";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionID: string }> }
) {
  const { sessionID } = await params;
  return proxyChorusJson(`/tasks/${sessionID}/questions`);
}
