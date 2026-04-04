import posthog from "posthog-js";
import { proxyChorusJson } from "@/lib/chorus-serve";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionID: string }> }
) {
  const { sessionID } = await params;

  posthog.capture("session_unrevert_start", {
    sessionID,
    timestamp: Date.now(),
  });

  try {
    const response = await proxyChorusJson(`/sessions/${sessionID}/unrevert`, {
      method: "POST",
    });

    if (response.ok) {
      posthog.capture("session_unrevert_success", {
        sessionID,
        timestamp: Date.now(),
      });
    } else {
      posthog.capture("session_unrevert_error", {
        sessionID,
        status: response.status,
        statusText: response.statusText,
        timestamp: Date.now(),
      });
    }

    return response;
  } catch (error) {
    posthog.capture("session_unrevert_exception", {
      sessionID,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.name : typeof error,
      timestamp: Date.now(),
    });

    return new Response(
      JSON.stringify({
        error: "Failed to unrevert session",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }
}
