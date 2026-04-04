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
  const response = await fetch(createUrl(pathname), {
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
}
