This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## AI Context & Cursor Rules

The following folders are **gitignored by default** so local AI edits do not show up in `git status` during normal development:

| Folder | Purpose |
|--------|---------|
| `.cursor/rules/` | Cursor steering rules (project conventions, business rules, coding standards) |
| `ai-context/` | Extended AI documentation and reference material |

### Commit manually when ready

When you want to save or share updates to these folders, force-add and commit them explicitly:

```bash
git add -f .cursor/ ai-context/
git commit -m "Update AI steering rules and context docs"
```

To stop tracking these folders if they were previously committed (one-time setup):

```bash
git rm -r --cached .cursor ai-context
git commit -m "Stop tracking local AI context folders"
```

After that, only manual `git add -f` commits will include changes from these directories.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
