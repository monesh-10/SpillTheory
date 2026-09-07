/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SpillTheory Cyber-Maritime Palette (media_1788793921660.png)
        navy: {
          950: '#050B14', // Deepest Abyss Canvas
          900: '#070F1D', // Primary Surface Base
          850: '#0B1523', // Elevated Panel Base
          800: '#0E1B2C', // Card Container
          750: '#112237', // Active Highlight Card
          700: '#162D4A', // Structural Border / Accent Border
          600: '#1E3A5F', // Muted Divider
        },
        cyan: {
          brand: '#00E5FF',  // Signature Electric Cyan
          bright: '#33EBFF', // Luminous Cyan
          dim: '#00B4D8',    // Deep Ocean Teal
          muted: '#0E3A4D',  // Subtle Cyan Tint Base
        },
        ink: {
          primary: '#F8FAFC',   // Crisp White / Pale Slate
          secondary: '#94A3B8', // Muted Technical Slate
          muted: '#64748B',     // Dimmed Monospace Text
          cyan: '#00E5FF',      // Electric Cyan Text
        },
        edge: {
          dark: '#162D4A',  // Panel Borders
          mid: '#1E3A5F',   // Sub-component Dividers
          light: '#2A4D7A', // Hover Borders
          cyan: '#00E5FF',  // Active Glowing Borders
        },
        semantic: {
          red: '#EF4444',    // Oil Slick / #1 Flagged Suspect
          amber: '#F59E0B',  // Probable Origin / Shoreline Risk
          green: '#10B981',  // FastAPI Online / High Proximity
          blue: '#3B82F6',   // Hindcast / Temporal Score
          purple: '#8B5CF6', // Navigation Paths / Forecast Corridor
        }
      },
      fontFamily: {
        sans: ['Inter', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 2px 8px rgba(6, 18, 28, 0.6)',
        'panel': '0 4px 20px rgba(4, 19, 28, 0.8)',
        'cyan-glow': '0 0 14px rgba(25, 199, 230, 0.25)',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '10px',
      }
    }
  },
  plugins: [],
};
