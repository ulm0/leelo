import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'warm'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => {
        set({ theme })
        // Apply theme to document
        const root = document.documentElement
        root.classList.remove('light', 'dark', 'warm')
        root.classList.add(theme)
      },
    }),
    {
      name: 'leelo-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Apply theme on hydration
          const root = document.documentElement
          root.classList.remove('light', 'dark', 'warm')
          root.classList.add(state.theme)
        }
      },
    }
  )
)