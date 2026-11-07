import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeftRight, FileText, HandCoins, Home, Menu, Moon, RotateCcw, Send, Sun } from 'lucide-react'
import { useResetDemo } from '@/api/queries'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Overview', icon: Home, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/payments', label: 'Send money', icon: Send },
  { to: '/receive', label: 'Receive money', icon: HandCoins },
  { to: '/requests', label: 'Payment requests', icon: FileText },
]

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('theme')
      return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {
      return false
    }
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      /* ignore */
    }
  }, [dark])
  return [dark, setDark] as const
}

function Logo() {
  return (
    <>
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-[26px]" />
      Ledgerly
    </>
  )
}

/** Sidebar body shared by the desktop aside and the mobile menu drawer. */
function SidebarContent({ dark, onToggleDark, onNavigate }: { dark: boolean; onToggleDark: () => void; onNavigate?: () => void }) {
  const reset = useResetDemo()
  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-[18px] text-base font-semibold tracking-[-0.01em]">
        <Logo />
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-sm transition-colors md:py-2',
                isActive ? 'bg-card text-foreground shadow-control font-medium' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
              )
            }
          >
            <Icon className="group-aria-[current=page]:text-primary size-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="flex flex-col gap-1 px-2.5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground justify-start px-2.5 text-[13px] font-normal hover:bg-transparent [&_svg:not([class*='size-'])]:size-3.5"
          onClick={() => reset.mutate()}
          disabled={reset.isPending}
        >
          <RotateCcw /> {reset.isPending ? 'Resetting…' : 'Reset demo data'}
        </Button>
        <div className="bg-card shadow-ring flex items-center gap-2.5 rounded-xl p-2.5">
          <div className="bg-primary text-primary-foreground grid size-[30px] shrink-0 place-items-center rounded-lg text-xs font-semibold">DT</div>
          <div className="min-w-0 flex-1 text-[13px] leading-[18px]">
            <div className="truncate font-medium">Acme Robotics, Inc.</div>
            <div className="text-muted-foreground truncate text-xs leading-4">Daniel T.</div>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground size-7" aria-label="Toggle dark mode" onClick={onToggleDark}>
            {dark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </div>
    </>
  )
}

export function AppShell() {
  const [dark, setDark] = useDarkMode()
  const toggleDark = () => setDark(!dark)
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the mobile menu on any navigation (links, back/forward, in-page links).
  const { pathname } = useLocation()
  const [menuPath, setMenuPath] = useState(pathname)
  if (pathname !== menuPath) {
    setMenuPath(pathname)
    setMenuOpen(false)
  }

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col px-1 md:flex">
        <SidebarContent dark={dark} onToggleDark={toggleDark} />
      </aside>

      {/* Mobile top bar */}
      <header className="bg-background/85 sticky top-0 z-40 flex items-center justify-between gap-2 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
        <div className="flex h-14 items-center gap-2.5 text-base font-semibold tracking-[-0.01em]">
          <Logo />
        </div>
        <Button variant="ghost" size="icon" className="-mr-2 size-10" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
          <Menu className="size-5" />
        </Button>
      </header>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="left"
          className="bg-background w-[280px] gap-0 border-r-0 px-1 sm:max-w-[280px] md:hidden"
          onOpenAutoFocus={(e) => {
            // Start on the current page's link rather than the first focusable control.
            const current = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[aria-current=page]')
            if (current) {
              e.preventDefault()
              current.focus()
            }
          }}
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Main navigation and account settings</SheetDescription>
          <SidebarContent dark={dark} onToggleDark={toggleDark} onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-1 md:p-2 md:pl-0">
          <div className="bg-panel min-w-0 flex-1 max-md:border-t max-md:border-hairline md:shadow-ring md:rounded-[14px]">
            <main className="mx-auto w-full max-w-[1120px] px-4 pt-5 pb-[max(3rem,env(safe-area-inset-bottom))] sm:px-6 md:px-10 md:pt-9">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
