import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
  ],
  theme: {
    extend: {
      colors: {
        // Warm, paper-like neutrals — modeled on the Claude UI
        cream: {
          50:  '#FBFAF6', // page background tint
          100: '#F6F4ED', // alt surface (sidebar, sections)
          200: '#EDE8DC', // hairline borders
          300: '#DDD5C4', // stronger borders
          400: '#B8AE99', // disabled / icons
          500: '#8B8270', // muted body text
          600: '#65604F', // secondary text
          700: '#3F3B30', // primary body
          800: '#2A2722', // headings
          900: '#1B1916', // strongest text
        },
        // Coral / clay accent (Claude's signature warm orange)
        clay: {
          50:  '#FAF1EB',
          100: '#F4E0D2',
          200: '#EBC4AE',
          300: '#DDA081',
          400: '#CE7B57',
          500: '#C15F3C', // primary accent
          600: '#A74E2F', // hover
          700: '#874028',
          800: '#693421',
          900: '#4F2819',
        },
      },
      fontFamily: {
        // Serif for display, used for h1-style page headings
        serif: ['"Source Serif 4"', '"Source Serif Pro"', '"Iowan Old Style"', 'Georgia', 'serif'],
        // System sans for everything else
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      letterSpacing: {
        'display': '-0.015em',
      },
      boxShadow: {
        'card': '0 1px 2px 0 rgb(63 59 48 / 0.04)',
        'pop':  '0 8px 24px -8px rgb(63 59 48 / 0.12)',
      },
    },
  },
} satisfies Config
