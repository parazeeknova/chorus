import { proxyChorusJson } from "@/lib/chorus-serve";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionID: string }> }
) {
  const { sessionID } = await params;

  try {
    const response = await proxyChorusJson(`/sessions/${sessionID}/diff`);
    return response;
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to get session diff",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
}
