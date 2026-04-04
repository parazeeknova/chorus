import {
  workspaceMutationSchema,
  workspaceSnapshotSchema,
} from "@chorus/contracts";
import { proxyChorusJson } from "@/lib/chorus-serve";

export async function GET() {
  const response = await proxyChorusJson("/workspace", {
    method: "GET",
  });

  if (response.ok) {
    workspaceSnapshotSchema.parse(await response.clone().json());
  }

  return response;
}

export async function POST(request: Request) {
  const body = workspaceMutationSchema.parse(await request.json());

  return proxyChorusJson("/workspace/mutations", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
