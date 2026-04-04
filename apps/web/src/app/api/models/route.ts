import { opencodeModelCatalogSchema } from "@chorus/contracts";
import type { NextRequest } from "next/server";
import { proxyChorusJson } from "@/lib/chorus-serve";

export async function GET(request: NextRequest) {
  const directory = request.nextUrl.searchParams.get("directory");
  const response = await proxyChorusJson(
    directory
      ? `/models?directory=${encodeURIComponent(directory)}`
      : "/models",
    {
      method: "GET",
    }
  );

  if (response.ok) {
    opencodeModelCatalogSchema.parse(await response.clone().json());
  }

  return response;
}
