# Lajme AI

A modern news aggregator website that fetches and displays news from Telegrafi RSS feed.

## Features

- 📰 Fetches latest news from Telegrafi RSS feed
- 🎨 Modern, responsive UI design
- 🔄 Real-time refresh functionality
- 📱 Mobile-friendly layout
- ⚡ Fast and efficient with Next.js

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:61337](http://localhost:61337) in your browser

## Project Structure

```
lajme-ai/
├── app/
│   ├── api/
│   │   └── news/
│   │       └── route.ts      # API route for fetching RSS feed
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page component
├── package.json
├── tsconfig.json
└── next.config.js
```

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **rss-parser** - RSS feed parsing
- **CSS Modules** - Styling

## Deployment

This project can be deployed on:
- Vercel (recommended for Next.js)
- Netlify
- Any Node.js hosting platform

## License

MIT

