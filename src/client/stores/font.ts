import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FontState {
  readingFont: string
  customFontUrl?: string
  setReadingFont: (font: string, customUrl?: string) => void
  resetFont: () => void
}

export const useFontStore = create<FontState>()(
  persist(
    (set) => ({
      readingFont: 'inter',
      customFontUrl: undefined,
      setReadingFont: (font: string, customUrl?: string) => 
        set({ readingFont: font, customFontUrl: customUrl }),
      resetFont: () => 
        set({ readingFont: 'inter', customFontUrl: undefined }),
    }),
    {
      name: 'font-preferences',
    }
  )
)

// Helper function to get font family CSS
export function getFontFamily(fontId: string, customUrl?: string): string {
  switch (fontId) {
    case 'inter':
      return 'Inter, system-ui, sans-serif'
    case 'open-sans':
      return 'Open Sans, system-ui, sans-serif'
    case 'roboto':
      return 'Roboto, system-ui, sans-serif'
    case 'merriweather':
      return 'Merriweather, Georgia, serif'
    case 'source-sans-pro':
      return 'Source Sans Pro, system-ui, sans-serif'
    case 'opendyslexic':
      return 'OpenDyslexic, system-ui, sans-serif'
    case 'lexend':
      return 'Lexend, system-ui, sans-serif'
    case 'atkinson-hyperlegible':
      return 'Atkinson Hyperlegible, system-ui, sans-serif'
    case 'custom':
      return customUrl ? 'custom-font, system-ui, sans-serif' : 'Inter, system-ui, sans-serif'
    default:
      return 'Inter, system-ui, sans-serif'
  }
}

// Helper function to load custom font
export function loadCustomFont(customUrl?: string) {
  if (!customUrl) return

  // Check if font is already loaded
  const existingLink = document.querySelector(`link[href="${customUrl}"]`)
  if (existingLink) return

  // Create font face
  const fontFace = new FontFace('custom-font', `url(${customUrl})`)
  
  fontFace.load().then((loadedFace) => {
    document.fonts.add(loadedFace)
  }).catch((error) => {
    console.error('Failed to load custom font:', error)
  })
} 