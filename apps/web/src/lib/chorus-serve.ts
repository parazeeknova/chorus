function getChorusServeUrl() {
  return process.env.CHORUS_SERVE_URL ?? "http://localhost:2000";
}

function createUrl(pathname: string) {
  return new URL(pathname, getChorusServeUrl()).toString();
}

export async function proxyChorusJson(
  pathname: string,
  init?: RequestInit
): Promise<Response> {
  const url = createUrl(pathname);

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const text = await response.text();

    return new Response(text, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("Failed to connect to Chorus serve:", {
      url,
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({
        code: "serve_connection_error",
        message: `Failed to connect to Chorus serve at ${getChorusServeUrl()}. Make sure the serve app is running.`,
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 503,
        headers: { "content-type": "application/json" },
      }
    );
  }
}
