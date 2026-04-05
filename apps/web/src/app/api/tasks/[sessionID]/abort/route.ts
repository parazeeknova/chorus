import { proxyChorusJson } from "@/lib/chorus-serve";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionID: string }> }
) {
  const { sessionID } = await params;

  return proxyChorusJson(`/tasks/${sessionID}/abort`, {
    method: "POST",
  });
}
