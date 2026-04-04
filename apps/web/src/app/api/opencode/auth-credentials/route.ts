import { opencodeCredentialCatalogSchema } from "@chorus/contracts";
import { proxyChorusJson } from "@/lib/chorus-serve";

export async function GET() {
  const response = await proxyChorusJson("/opencode/auth-credentials", {
    method: "GET",
  });

  if (response.ok) {
    opencodeCredentialCatalogSchema.parse(await response.clone().json());
  }

  return response;
}
