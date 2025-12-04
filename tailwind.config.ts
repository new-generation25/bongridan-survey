import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        background: '#F9FAFB',
        card: '#FFFFFF',
        textPrimary: '#111827',
        textSecondary: '#6B7280',
        border: '#E5E7EB',
      },
    },
  },
  plugins: [],
};

export default config;

