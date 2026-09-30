# CalcLab — Scientific Calculator V1

A Next.js + TypeScript foundation for a complete scientific calculator toolbox.

## Requirements

- Node.js 20+
- VS Code
- Git

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build check

```bash
npm run build
```

## GitHub

```bash
git init
git add .
git commit -m "Initial CalcLab calculator"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

## Vercel

Import the GitHub repository into Vercel. The default Next.js build settings can be used.

## Architecture

The calculator UI is separated from the calculation logic so that the engine can later be reused when we package the product for Android.

## Roadmap

1. V1 scientific calculator
2. Calculator toolbox modules
3. Unit converter
4. Graphing
5. Algebra/statistics/matrix/complex tools
6. PWA/offline support
7. Android packaging/testing
8. Production release
