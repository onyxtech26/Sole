"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { label: "Schedule", href: "/schedule" },
  { label: "Reservations", href: "/reservations" },
  { label: "Products", href: "/products" },
  { label: "Reports", href: "/reports" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">S</div>
        <div>
          <strong>Sole</strong>
          <span>Sun Tours</span>
        </div>
      </div>

      <div>
        <p className="workspace-label">Operations</p>
        <nav className="nav-list" style={{ marginTop: 10 }}>
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} className={`nav-item${active ? " active" : ""}`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <p className="demo-note">Prototype · demo data. Grouping is at traveller level.</p>
        <button className="signout" onClick={signOut}>Sign out</button>
      </div>
    </aside>
  );
}
