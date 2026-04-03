import { BackgroundCanvas } from "@/features/canvas/components/background-canvas";

export default function BackgroundPage() {
  return (
    <main className="relative h-screen overflow-hidden bg-[#020817] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.18),transparent_38%),linear-gradient(180deg,#030712_0%,#020817_100%)]" />
      <div className="relative z-10 h-full w-full">
        <BackgroundCanvas />
      </div>
    </main>
  );
}
