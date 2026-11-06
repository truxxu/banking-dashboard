import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ArrowLeftRight, BarChart3, CreditCard, FileText, Home, Moon, RotateCcw, Send, Settings, Sun, Users } from 'lucide-react'
import { useResetDemo } from '@/api/queries'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Overview', icon: Home, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
  { to: '/payments', label: 'Send money', icon: Send },
]
/** Shown but disabled — makes the product feel complete without building it. */
const COMING_SOON = [
  { label: 'Cards', icon: CreditCard },
  { label: 'Invoicing', icon: FileText },
  { label: 'Team', icon: Users },
  { label: 'Settings', icon: Settings },
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

export function AppShell() {
  const [dark, setDark] = useDarkMode()
  const reset = useResetDemo()

  return (
    <div className="flex min-h-svh">
      <aside className="bg-sidebar hidden w-60 shrink-0 flex-col border-r md:flex">
        <div className="flex h-14 items-center gap-2 px-5 font-semibold">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-6" />
          Ledgerly
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 px-3 py-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  isActive ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
          <div className="text-muted-foreground mt-6 mb-1 px-2.5 text-xs font-medium">Coming soon</div>
          {COMING_SOON.map(({ label, icon: Icon }) => (
            <span key={label} aria-disabled className="text-muted-foreground/60 flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm">
              <Icon className="size-4" />
              {label}
            </span>
          ))}
        </nav>
        <div className="flex flex-col gap-2 border-t p-3">
          <Button variant="ghost" size="sm" className="justify-start" onClick={() => reset.mutate()} disabled={reset.isPending}>
            <RotateCcw /> {reset.isPending ? 'Resetting…' : 'Reset demo data'}
          </Button>
          <div className="flex items-center gap-2.5 px-2.5 py-1.5">
            <div className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-full text-xs font-medium">DT</div>
            <div className="min-w-0 flex-1 text-sm">
              <div className="truncate font-medium">Acme Robotics, Inc.</div>
              <div className="text-muted-foreground truncate text-xs">Daniel T.</div>
            </div>
            <Button variant="ghost" size="icon" aria-label="Toggle dark mode" onClick={() => setDark(!dark)}>
              {dark ? <Sun /> : <Moon />}
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile nav */}
        <nav aria-label="Main" className="bg-sidebar flex gap-1 overflow-x-auto border-b px-3 py-2 md:hidden">
          {NAV.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('rounded-md px-3 py-1.5 text-sm whitespace-nowrap', isActive ? 'bg-accent font-medium' : 'text-muted-foreground')}>
              {label}
            </NavLink>
          ))}
        </nav>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
