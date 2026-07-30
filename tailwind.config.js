/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        'oas-accent': 'var(--color-oas-accent)',
        'oas-accent-dark': 'var(--color-oas-accent-dark)',
        'oas-accent-bg': 'var(--color-oas-accent-bg)',
        'oas-navy': 'var(--color-oas-navy)',
        'oas-navy-dark': 'var(--color-oas-navy-dark)',
        'oas-navy-mid': 'var(--color-oas-navy-mid)',
        'oas-bg': 'var(--color-oas-bg)',
        'oas-line': 'var(--color-oas-line)',
        'oas-ink': 'var(--color-oas-ink)',
        'oas-ink2': 'var(--color-oas-ink2)',
        'oas-muted': 'var(--color-oas-muted)',
        'oas-faint': 'var(--color-oas-faint)',
        'oas-ok': 'var(--color-oas-ok)',
        'oas-ok-bg': 'var(--color-oas-ok-bg)',
        'oas-info': 'var(--color-oas-info)',
        'oas-info-bg': 'var(--color-oas-info-bg)',
        'oas-warn': 'var(--color-oas-warn)',
        'oas-warn-bg': 'var(--color-oas-warn-bg)',
        'oas-bad': 'var(--color-oas-bad)',
        'oas-bad-bg': 'var(--color-oas-bad-bg)'
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' }
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'reveal': {
          '0%': { clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)' },
          '100%': { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }
        }
      },
      animation: {
        marquee: 'marquee 25s linear infinite',
        'fade-in-up': 'fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'reveal': 'reveal 1.2s cubic-bezier(0.77, 0, 0.175, 1) forwards'
      }
    },
  },
  plugins: [],
}
