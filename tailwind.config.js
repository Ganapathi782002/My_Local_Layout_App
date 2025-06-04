/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      backgroundImage: {
        'grid-light': 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0z\' fill=\'#ffffff\'/%3E%3Cpath d=\'M0 5h20v1H0V5zm0 10h20v1H0v-1zm5 0v10h1V10H5zm10-10v20h1V0H15z\' fill-opacity=\'0.8\' fill=\'%230000FF\' stroke=\'%230000FF\' stroke-opacity=\'0.8\'/%3E%3C/svg%3E")',
        'grid-dark': 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h20v20H0z\' fill=\'#ffffff\'/%3E%3Cpath d=\'M0 0h20v1H0V0zM0 19h20v1H0v-1zM0 9h20v1H0V9zM0 10h20v1H0v-1zM9 0v20h1V0H9zM10 0v20h1V0h-1z\' fill-opacity=\'.3\' fill=\'%23e5e7eb\'/%3E%3C/svg%3E")',
      },
    },
  },
  plugins: [],
};