import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { ArrowLeftRight, FileText, HandCoins, Home, Moon, RotateCcw, Send, Sun } from 'lucide-react'
import { useResetDemo } from '@/api/queries'
import { Button } from '@/components/ui/button'
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

export function AppShell() {
  const [dark, setDark] = useDarkMode()
  const reset = useResetDemo()

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col px-1 md:flex">
        <div className="flex h-16 items-center gap-2.5 px-[18px] text-base font-semibold tracking-[-0.01em]">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-[26px]" />
          Ledgerly
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 px-2.5 py-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm transition-colors',
                  isActive ? 'bg-card text-foreground shadow-control font-medium' : 'text-muted-foreground hover:bg-card/60 hover:text-foreground',
                )
              }
            >
              <Icon className="group-aria-[current=page]:text-primary size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-1 px-2.5 pt-3 pb-4">
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
            <Button variant="ghost" size="icon" className="text-muted-foreground size-7" aria-label="Toggle dark mode" onClick={() => setDark(!dark)}>
              {dark ? <Sun /> : <Moon />}
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile nav */}
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto px-3 py-2 md:hidden">
          {NAV.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cn('rounded-md px-3 py-1.5 text-sm whitespace-nowrap', isActive ? 'bg-card shadow-control font-medium' : 'text-muted-foreground')}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-1 p-2 pt-0 md:pt-2 md:pl-0">
          <div className="bg-panel shadow-ring min-w-0 flex-1 rounded-[14px]">
            <main className="mx-auto w-full max-w-[1120px] px-4 pt-7 pb-12 md:px-10 md:pt-9">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
