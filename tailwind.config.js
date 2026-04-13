// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'marquee-left': 'marquee-left 30s linear infinite',
      },
      keyframes: {
        'marquee-left': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
};