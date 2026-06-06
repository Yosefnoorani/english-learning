import { useEffect, useState } from 'react'
import { useGameStore } from '@/store/useGameStore'

/** Wait for zustand persist before rendering store-dependent UI (React 19 safe). */
export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useGameStore.persist.hasHydrated())

  useEffect(() => {
    if (useGameStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    return useGameStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])

  return hydrated
}
