# Contributing Guide

How the agent team works together. All agents must read this before writing any code.

---

## Branch naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feature/ISSUE-ID-short-description` | `feature/12-analyst-agent` |
| Bug fix | `fix/ISSUE-ID-short-description` | `fix/34-cron-timezone` |
| Docs | `docs/short-description` | `docs/update-setup-guide` |
| Chore | `chore/short-description` | `chore/update-dependencies` |

- Always branch from `main`
- Never commit directly to `main`
- Delete branch after PR is merged

---

## Commit message format

```
type(scope): short description

Optional body if needed.

Refs #ISSUE-ID
```

Types: `feat` `fix` `docs` `test` `chore` `refactor`

Examples:
```
feat(analyst): add sentiment tagging with topic extraction Refs #12
fix(cron): correct timezone handling for daily alerts Refs #34
docs(setup): add ngrok configuration steps Refs #5
```

Rules:
- Subject line max 72 characters
- Present tense ("add" not "added")
- Always reference the issue number

---

## Pull request process

1. Agent creates feature branch from `main`
2. Agent writes code + tests
3. Agent opens PR — description must include: what was built, how to test it, known limitations
4. QA Agent posts test results as PR comment
5. Tech Lead Agent posts summary to Partha via Telegram
6. Partha approves merge on GitHub
7. Branch deleted after merge

### PR checklist

```
- [ ] Tests written and passing
- [ ] .env.example updated if new env vars added
- [ ] DEPENDENCIES.md updated if new packages added
- [ ] No console.log left in production code
- [ ] Error handling in place for all async operations
```

---

## Definition of done

A task is complete when:
- Code works end-to-end
- Unit tests pass
- QA Agent has reviewed and approved
- PR merged to main
- Vercel staging deploy succeeds
- No regressions in existing functionality

---

## Code standards

- TypeScript strict mode — no `any` types
- All async functions use try/catch
- All Claude API calls wrapped in Langfuse trace
- Environment variables via `process.env.VARNAME` — never hardcoded
- Secrets never committed — use `.env.local` locally, Vercel env vars in staging
- Functions max 40 lines
- Files max 300 lines

---

## Testing standards

- Unit tests for all agent prompt functions
- Integration tests for all API route handlers
- Test files colocated: `src/agents/analyst.test.ts` beside `src/agents/analyst.ts`
- All tests must pass before PR approval
