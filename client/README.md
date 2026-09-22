# Online Exam System

A platform for creating, managing, and running online exams, built with React 19, TypeScript, Vite, and Tailwind CSS v4.

The long-term goal is a sellable product with tiered plans (Free / Gold / Platinum / VIP), but right now the focus is on getting the frontend fully built out and polished before the real backend goes in.

## Current status

⚠️ **This is a frontend-only project.** There's no real server or database yet. All data — exams, questions, students, users — lives in in-memory arrays inside `src/api/*.ts` and resets on every page refresh (the logged-in user is the one exception, since that's kept in `localStorage`). This mock layer is deliberately shaped so it can be swapped for real API calls later without touching any components or pages.

## Tech stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4 (via the `@tailwindcss/vite` plugin)
- react-router-dom v7
- lucide-react for icons
- recharts for charts
- xlsx for importing/exporting question banks from Excel

## Getting started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Roles and access

The system has three roles:

| Role | Access |
|---|---|
| **SuperAdmin** | Full, unrestricted access — every group, exam, student, and the system-wide reports. |
| **Instructor** | Scoped to the groups they own (`Group.instructorId`) — exams, lessons, and students only within those groups. |
| **Student** | Scoped to whatever groups they've been added to (`Group.studentIds`) — sees only the exams and lessons for those groups, no management access at all. |

**One thing worth knowing:** when an Instructor adds a new student from the Students page, they also set a username for them — that immediately creates a real (mock) login account. On its own, though, that doesn't grant access to anything. Access is entirely driven by group membership (`Group.studentIds`), which is managed separately from the Groups page — so the instructor still needs to add the student to the relevant group(s) after creating their account.

Test accounts (any password works, since there's no real backend yet):

- \`admin\` → SuperAdmin
- \`instructor1\` → Instructor (two groups: Math and Physics)
- \`student1\` → Student (member of the Math group)

## Roadmap

The plan is to finish and polish the frontend first, then bring in a real backend (Node.js + PostgreSQL) to replace the mock layer in \`src/api/*.ts\` — without requiring changes to any components or pages.