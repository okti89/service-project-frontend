/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'

const ThemeContext = createContext(null)

const THEMES = {
  light: {
    name: 'light',
    colors: {
      appBg: '#f4f7fb',
      shellBg: '#ffffff',
      shellSoft: '#f8fafc',
      border: '#d9e2ec',
      text: '#12263a',
      muted: '#5c7087',
      topbarBg: '#e9f0f8',
      topbarText: '#17324d',
      primary: '#2d7ff9',
      success: '#2f9e44',
      warning: '#f08c00',
      info: '#0ea5e9',
      danger: '#e03131',
    },
  },
  dark: {
    name: 'dark',
    colors: {
      appBg: '#0f1720',
      shellBg: '#131e2b',
      shellSoft: '#1a2938',
      border: '#2b3f52',
      text: '#e6edf5',
      muted: '#9fb0c2',
      topbarBg: '#17293b',
      topbarText: '#d7e4f1',
      primary: '#4c8dff',
      success: '#3fb66f',
      warning: '#f4a340',
      info: '#38bdf8',
      danger: '#ff6b6b',
    },
  },
}

export function ThemeProvider({ children }) {
  const [themeName, setThemeName] = useState('dark')

  const toggleMode = () => {
    setThemeName((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const value = useMemo(
    () => ({
      themeName,
      theme: THEMES[themeName],
      toggleMode,
    }),
    [themeName]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used inside ThemeProvider')
  }
  return ctx
}
