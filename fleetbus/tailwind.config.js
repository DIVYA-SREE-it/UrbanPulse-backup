/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F1F5F9',
          tertiary: '#E2E8F0',
          dark: '#0F172A'
        },
        sidebar: {
          DEFAULT: '#FFFFFF',
          hover: '#F8FAFC',
          active: '#EFF6FF',
          border: '#E2E8F0'
        },
        brand: {
          primary: '#2563EB',
          dark: '#1D4ED8',
          hover: '#1D4ED8',
          light: '#EFF6FF',
          accent: '#3B82F6',
          muted: '#DBEAFE'
        },
        urbanText: {
          DEFAULT: '#0F172A',
          secondary: '#64748B',
          muted: '#94A3B8',
          light: '#F8FAFC'
        },
        urbanBorder: '#E2E8F0',
        danger: {
          DEFAULT: '#DC2626',
          light: '#FEF2F2',
          border: '#FECACA'
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FFFBEB',
          border: '#FDE68A'
        },
        info: {
          DEFAULT: '#0284C7',
          light: '#F0F9FF',
          border: '#BAE6FD'
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#F0FDF4',
          border: '#BBF7D0'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace']
      },
      borderRadius: {
        'card': '10px',
        'subtle': '6px'
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        'card': '0 2px 6px -1px rgba(15, 23, 42, 0.06), 0 1px 3px -1px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 6px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        'modal': '0 16px 36px -6px rgba(15, 23, 42, 0.16), 0 6px 12px -3px rgba(15, 23, 42, 0.08)'
      }
    },
  },
  plugins: [],
}
