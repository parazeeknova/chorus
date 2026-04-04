import { queueBoardPromptInputSchema } from "@chorus/contracts";
import { proxyChorusJson } from "@/lib/chorus-serve";

export async function POST(request: Request) {
  const body = queueBoardPromptInputSchema.parse(await request.json());

  return proxyChorusJson("/tasks", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
