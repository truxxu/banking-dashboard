import { useCallback, useSyncExternalStore } from 'react'

const lists = new Map<string, MediaQueryList>()
function mediaQueryList(query: string) {
  let mql = lists.get(query)
  if (!mql) lists.set(query, (mql = window.matchMedia(query)))
  return mql
}

/** Subscribes to a CSS media query, e.g. `useMediaQuery('(min-width: 640px)')`. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = mediaQueryList(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => mediaQueryList(query).matches, () => false)
}
