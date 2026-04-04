import { proxyChorusJson } from "@/lib/chorus-serve";

export function POST() {
  return proxyChorusJson("/projects/open-folder", {
    method: "POST",
  });
}
