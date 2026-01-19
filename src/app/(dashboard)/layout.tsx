import Link from "next/link";

import { getUserRole, requireUser } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { SessionMonitor } from "@/components/session-monitor";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  const role = await getUserRole();

  const navLinks =
    role === "admin"
      ? [
          { href: "/admin", label: "Overview" },
          { href: "/admin/users", label: "Users" },
          { href: "/admin/candidates", label: "Candidates" },
          { href: "/admin/voters", label: "Voters" },
          { href: "/admin/voters/import", label: "Import" },
          { href: "/admin/activity", label: "Activity" },
        ]
      : [
          { href: "/candidate/voters", label: "Voters" },
        ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href={role === "admin" ? "/admin" : "/candidate"} className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base truncate">PNC Voter DB</span>
            </Link>
            <span className="hidden sm:inline-flex rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize text-secondary-foreground">
              {role}
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>
      
      {role === "admin" && (
        <nav className="border-b bg-muted/40 overflow-x-auto">
          <div className="flex gap-1 px-4 sm:px-6 py-2 min-w-max">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <main className="px-4 sm:px-6 py-4 sm:py-6">{children}</main>
      <SessionMonitor />
    </div>
  );
}
