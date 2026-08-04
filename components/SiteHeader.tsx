"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Главная" },
  { href: "/register", label: "Создать команду" },
  { href: "/teams", label: "Команды" },
  { href: "/bracket", label: "Сетка" },
  { href: "/admin", label: "Админ" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("nav-open", isMenuOpen);

    return () => {
      document.body.classList.remove("nav-open");
    };
  }, [isMenuOpen]);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand">
          <span className="site-header__mark">CS2</span>
          <span className="site-header__title">
            <strong>АО «ЦРТР»</strong>
            <small>CS2 Tournament</small>
          </span>
        </Link>

        <button
          type="button"
          className={`site-header__burger${isMenuOpen ? " is-open" : ""}`}
          aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav
          className={`site-header__nav${isMenuOpen ? " is-open" : ""}`}
          aria-label="Основная навигация"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const isAdmin = item.href === "/admin";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${isAdmin ? "site-header__admin" : "site-header__link"}${isActive ? " is-active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
