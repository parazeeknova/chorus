import { proxyChorusJson } from "@/lib/chorus-serve";

export function GET() {
  return proxyChorusJson("/projects", {
    method: "GET",
  });
}
