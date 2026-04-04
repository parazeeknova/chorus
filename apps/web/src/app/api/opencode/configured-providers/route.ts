import { opencodeConfiguredProviderCatalogSchema } from "@chorus/contracts";
import { proxyChorusJson } from "@/lib/chorus-serve";

export async function GET() {
  const response = await proxyChorusJson("/opencode/configured-providers", {
    method: "GET",
  });

  if (response.ok) {
    opencodeConfiguredProviderCatalogSchema.parse(
      await response.clone().json()
    );
  }

  return response;
}
