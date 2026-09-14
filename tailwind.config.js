export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#ffffff',
        glass: 'rgba(255,255,255,0.72)',
      },
      boxShadow: {
        soft: '0 18px 48px rgba(15, 23, 42, 0.08)',
        insetSoft: 'inset 0 1px 0 rgba(255,255,255,0.32)',
      },
    },
  },
  plugins: [],
};
