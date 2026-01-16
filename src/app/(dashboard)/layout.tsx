import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getUserRole, requireUser } from "@/lib/auth";

import { signOutAction } from "./actions";

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
          { href: "/admin/voters/import", label: "CSV Import" },
          { href: "/admin/activity", label: "Activity" },
        ]
      : [
          { href: "/candidate", label: "Overview" },
          { href: "/candidate/voters", label: "Voters" },
        ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-slate-900">
              Maldives Voter DB
            </span>
            <span className="text-xs text-slate-500 capitalize">{role ?? ""}</span>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
        <nav className="mx-auto w-full max-w-6xl px-4 pb-3">
          <ul className="flex flex-wrap gap-2 text-sm">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-full border border-slate-200 px-3 py-1 text-slate-700 transition hover:bg-slate-100"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
