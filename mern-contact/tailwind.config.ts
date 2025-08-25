import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './app/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}'
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: '#0ea5e9',
                    dark: '#0369a1'
                }
            }
        }
    },
    plugins: []
}

export default config