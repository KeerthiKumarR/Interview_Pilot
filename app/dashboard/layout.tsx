import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { authorizeAdmin, authorizeStaff } from "@/lib/admin-auth";
import { Badge } from "@/components/ui/badge";
import { MiraiLogo } from "@/components/mirai-logo";

/**
 * Dashboard layout — top navigation with logo, module navigation, user controls.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const isStaff = await authorizeStaff();
  const isAdmin = await authorizeAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top Navigation */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6 bg-background">
        {/* Left: Logo & Branding */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <MiraiLogo size={28} showText={true} textClassName="text-sm font-bold tracking-tight text-foreground" />
          </Link>
          <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] py-0 px-1.5 font-semibold">
            MSOT
          </Badge>
        </div>

        {/* Right: Module Navigation & User controls */}
        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-3 text-xs sm:text-sm font-medium">
            <Link
              href="/dashboard/profile-intake"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              1. Profile Intake
            </Link>
            <Link
              href="/dashboard/review"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              2. Review Engine
            </Link>
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              3. Mock Interview
            </Link>
            <Link
              href="/dashboard/readiness"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              4. Readiness Score
            </Link>
            <Link
              href="/dashboard/jobs"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              5. Jobs & Drives
            </Link>
            {isStaff && (
              <Link
                href="/admin/jobs"
                className="text-primary font-semibold hover:underline transition-colors"
              >
                MSOT Staff Board
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="text-amber-600 dark:text-amber-400 font-semibold hover:underline transition-colors"
              >
                Admin
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <ThemeToggle />
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-background">{children}</main>
    </div>
  );
}
