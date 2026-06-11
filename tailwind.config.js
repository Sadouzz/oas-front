/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
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
      }
    },
  },
  plugins: [],
}
