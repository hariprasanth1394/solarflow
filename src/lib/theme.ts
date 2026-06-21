export const THEME_STORAGE_KEY = "solarflow-theme"

/** Inline script — must run before React hydrates to avoid theme flash / mismatch. */
export const themeInitScript = `(function(){try{var key='${THEME_STORAGE_KEY}';var saved=localStorage.getItem(key);var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var isDark=saved?saved==='dark':prefersDark;var root=document.documentElement;if(isDark){root.classList.add('theme-dark');root.classList.add('dark');}else{root.classList.remove('theme-dark');root.classList.remove('dark');}}catch(e){}})();`

export function toggleTheme() {
  if (typeof document === "undefined") return

  const root = document.documentElement
  const nextDark = !root.classList.contains("theme-dark")
  root.classList.toggle("theme-dark", nextDark)
  root.classList.toggle("dark", nextDark)
  window.localStorage.setItem(THEME_STORAGE_KEY, nextDark ? "dark" : "light")
}
