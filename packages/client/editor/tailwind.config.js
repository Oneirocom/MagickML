const { createGlobPatternsForDependencies } = require('@nx/react/tailwind')
const { join } = require('path')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(
      __dirname,
      '{src,pages,components,app}/**/*!(*.stories|*.spec).{ts,tsx,html}'
    ),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {
      fontFamily: {
        berkeleyMono: [
          'BerkeleyMono-Regular',
          'IBM Plex Sans',
          'IBM Plex Mono',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
