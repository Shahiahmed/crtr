"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  CAPTAIN_SESSION_EVENT,
  readCaptainSession,
  syncCaptainSession,
  type CaptainSession,
} from "@/lib/captain-session";

const NAV_ITEMS = [
  { href: "/", label: "Главная" },
  { href: "/register", label: "Создать команду" },
  { href: "/legionnaire", label: "Легионер" },
  { href: "/teams", label: "Команды" },
  { href: "/bracket", label: "Сетка" },
  { href: "/admin", label: "Админ" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [captainSession, setCaptainSession] = useState<CaptainSession | null>(null);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("nav-open", isMenuOpen);

    return () => {
      document.body.classList.remove("nav-open");
    };
  }, [isMenuOpen]);

  useEffect(() => {
    let isMounted = true;

    async function refreshCaptainSession() {
      const session = await syncCaptainSession();

      if (isMounted) {
        setCaptainSession(session);
      }
    }

    void refreshCaptainSession();

    const handleSessionChange = () => {
      void refreshCaptainSession();
    };

    window.addEventListener(CAPTAIN_SESSION_EVENT, handleSessionChange);
    window.addEventListener("storage", handleSessionChange);

    return () => {
      isMounted = false;
      window.removeEventListener(CAPTAIN_SESSION_EVENT, handleSessionChange);
      window.removeEventListener("storage", handleSessionChange);
    };
  }, []);

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

          {captainSession ? (
            <Link
              href="/my-team"
              className={`site-header__my-team${pathname.startsWith("/manage") || pathname === "/my-team" ? " is-active" : ""}`}
              onClick={(event) => {
                event.preventDefault();
                setIsMenuOpen(false);

                const freshSession = readCaptainSession();
                router.push(
                  freshSession
                    ? `/manage/${freshSession.manageToken}`
                    : "/my-team",
                );
              }}
            >
              Моя команда
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
