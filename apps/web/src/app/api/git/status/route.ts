import { proxyChorusJson } from "@/lib/chorus-serve";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const directory = searchParams.get("directory");

  if (!directory) {
    return new Response(
      JSON.stringify({
        error: "Missing required parameter: directory",
      }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      }
    );
  }

  const query = new URLSearchParams({ directory });

  try {
    const response = await proxyChorusJson(`/git/status?${query}`);
    return response;
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to get git status",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
}
