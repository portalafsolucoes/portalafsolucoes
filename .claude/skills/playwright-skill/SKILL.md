---
name: playwright-skill
description: Complete browser automation with Playwright. Auto-detects dev servers, writes clean test scripts to /tmp. Test pages, fill forms, take screenshots, check responsive design, validate UX, test login flows, check links, automate browser interactions.
---

Use the local skill directory as runtime root.

## Workflow
1. Detect dev servers first with `node -e "require('./lib/helpers').detectDevServers().then(servers => console.log(JSON.stringify(servers)))"`
2. Write temporary automation scripts outside the repo
3. Execute with `node run.js <script>` from this skill directory
4. Default to visible browser unless headless is explicitly requested

## Setup

```bash
cd .claude/skills/playwright-skill
npm run setup
```