"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Главная" },
  { href: "/register", label: "Создать команду" },
  { href: "/teams", label: "Команды" },
  { href: "/bracket", label: "Сетка" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand">
          <span className="site-header__mark">CS</span>
          <span className="site-header__title">
            <strong>АО «ЦРТР»</strong>
            <small>Corporate Tournament</small>
          </span>
        </Link>

        <nav className="site-header__nav" aria-label="Основная навигация">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`site-header__link${isActive ? " is-active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link href="/admin" className="site-header__admin">
            Админ
          </Link>
        </nav>
      </div>
    </header>
  );
}
