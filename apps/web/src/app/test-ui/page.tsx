import { Button } from "@/components/ui/button";

export default function TestPage() {
  return (
    <div className="space-y-4 p-8">
      <h1 className="font-bold text-2xl">Shadcn UI Test</h1>
      <div className="flex gap-4">
        <Button>Default Button</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
    </div>
  );
}
