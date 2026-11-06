import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MiraiLogo } from "@/components/mirai-logo";
import { ArrowLeft } from "lucide-react";

export default async function SignUpPage() {
  const { userId } = await auth();

  // If candidate is already signed in, forward directly to the dashboard
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground bg-dot-grid-subtle">
      {/* Top Google Tech 4-Color Accent Stripe */}
      <div className="h-1.5 w-full grid grid-cols-4 shrink-0 border-b border-border/80">
        <div className="bg-[#4285F4]"></div>
        <div className="bg-[#EA4335]"></div>
        <div className="bg-[#FBBC05]"></div>
        <div className="bg-[#34A853]"></div>
      </div>

      {/* Top Header */}
      <header className="flex h-16 w-full items-center justify-between border-b-2 border-border bg-card/85 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/">
            <MiraiLogo size={32} showText={true} textClassName="text-sm font-bold tracking-tight text-foreground" />
          </Link>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Centered Auth Form */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md flex flex-col items-center">
          <SignUp
            fallbackRedirectUrl="/dashboard"
            forceRedirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "border-2 border-border rounded-3xl bg-card neo-shadow shadow-xl w-full",
              },
            }}
          />
        </div>
      </main>
    </div>
  );
}
