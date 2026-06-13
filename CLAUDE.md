# Engineering Best Practices

This file governs how AI-assisted development should be conducted in this codebase. It applies to all contributors using Claude Code and serves as a shared reference for engineering standards across teams.

---

## How to use this template

This file is a starting point, not a final specification. Fork it, adapt it, and commit it as `CLAUDE.md` at the root of your repository.

**Keep as-is (invariant):** Core Principles, Code Quality, Testing, Security, Secure by Design, Observability & Logging, and Architecture & Design. These are universal engineering standards; weakening them reduces the value of the template for your team and makes it harder to share practices across teams.

**Customize for your context:**
- **Agent Workflow — Step 1:** Replace `{JIRA-TICKET}` with your issue tracker's identifier format (GitHub Issues, Linear, Shortcut, etc.), or remove the ticket requirement if your team does not use one.
- **Agent Workflow — Step 5:** Reorder the test runner detection table to put your primary language first.
- **Commit Standards:** Adopt Conventional Commits as written, or substitute your team's preferred format — but pick one and apply it consistently.
- **Definition of Done:** Add or remove gates to match your team's release process (e.g., QA sign-off, load test, security review).

**Extend with team-specific sections:** Add language-, framework-, or domain-specific guidance below the existing sections. Prefer adding new sections over editing shared ones so the document stays composable with future updates to the base template.

---

## Local Development Setup

**Prerequisites:** Node.js 20+ and npm 10.9.8 (pinned via `packageManager` in
`web/package.json`). No database, message broker, or other service dependency is
required — the game runs entirely in the browser.

The Angular project lives in `web/`, so all commands run from there:

```bash
# 1. Install dependencies (clean, lockfile-exact install)
cd web && npm ci

# 2. Start the dev server (http://localhost:4200/)
npm start

# 3. Run the test suite
npm test

# 4. Lint and build (the same checks CI runs)
npm run lint
npm run build
```

To publish to GitHub Pages, run `npm run deploy` from `web/`. See
[`web/README.md`](web/README.md) for game modes, controls, and deployment details.

---

## Core Principles

1. **Correctness over cleverness.** Working, readable code beats elegant but opaque code.
2. **Minimal footprint.** Only add what the task actually requires. No speculative features, premature abstractions, or unused helpers.
3. **Leave it better.** Don't degrade quality in the area you touched, but don't refactor adjacent code that wasn't part of the task.
4. **Verify before assuming.** Read the relevant code before suggesting or making changes. Don't guess at behavior.

---

## Code Quality

### Simplicity
- Prefer the simplest solution that correctly solves the problem.
- Avoid over-engineering: don't design for hypothetical future requirements.
- Three similar lines of code is better than a premature abstraction.
- Remove dead code rather than commenting it out.

### Naming
- Names should describe intent, not implementation (`processOrder`, not `doStuff`).
- Avoid abbreviations unless they are universally understood in the domain.
- Boolean variables and functions should read as assertions (`isEnabled`, `hasPermission`).

### Readability
- Keep functions small and focused on a single responsibility.
- Avoid deep nesting; prefer early returns and guard clauses.
- Only add comments where the logic is not self-evident. Code should explain *what*; comments explain *why*.
- Do not add docstrings, type annotations, or comments to code you did not change.

### Error Handling
- Only handle errors that can actually occur. Don't add fallbacks for impossible scenarios.
- Validate inputs at system boundaries (user input, external APIs, file I/O). Trust internal interfaces.
- Propagate errors meaningfully — don't swallow exceptions without logging or re-raising.

---

## Testing

### What to test
- Test observable behavior, not internal implementation details.
- Focus on the public interface; avoid testing private methods directly.
- Tests should document expected behavior, not just exercise code paths.
- **Always write both positive and negative tests.** A test suite that only covers the happy path is incomplete.

Negative tests must cover, at minimum:
- Invalid or malformed inputs (nulls, empty strings, out-of-range values, wrong types)
- Missing required fields or parameters
- Boundary conditions (zero, one, max, min, empty collections)
- Expected exceptions — assert both the exception type and message where meaningful
- Unauthorized or forbidden access attempts where applicable

For every behavior you test with valid input, ask: *"What should happen when this input is wrong or missing?"* If the answer is defined, write the test.

### Test design
- Each test should have a single, clear assertion or behavioral outcome.
- Arrange, Act, Assert: keep setup, execution, and verification distinct.
- Avoid logic (loops, conditionals) in tests — if it's complex, it's likely testing too much.
- Name tests to describe what they verify: `should_reject_expired_token`, not `test_auth`.

### Mocking
- Only mock at external system boundaries (databases, APIs, file system, time).
- Do not mock internal code or application logic — it creates false confidence.
- Prefer integration tests over heavily mocked unit tests for critical paths.

### API contract testing

An API contract is the agreed interface between a producer and its consumers — the set of endpoints, request shapes, response shapes, status codes, and error formats that both sides depend on. Contract violations are a leading cause of integration failures that unit and component tests cannot catch.

**What to contract-test:**
- All valid request shapes return the documented response schema
- All documented error conditions return the correct status code and error format
- Boundary values of every numeric parameter (min, max, and one beyond each limit)
- Required fields — requests missing them must be rejected with a clear, consistent error
- Optional fields — their presence or absence must not cause unexpected behavior

**How to write contract tests:**
- Treat the API specification (OpenAPI, GraphQL schema, Protobuf, etc.) as the source of truth. Tests assert conformance to the spec, not to the current implementation.
- Cover both sides of every contract boundary: the endpoint that enforces a constraint and the client that must respect it. A query parameter limit on the server (e.g., `limit ≤ 100`) must be matched by a client that never exceeds it — and a test on each side that verifies this.
- When a contract must change, version it explicitly. Do not silently alter response shapes or remove fields; consumers will break without warning.

**What must never be skipped:**
- Numeric bounds on query parameters and request body fields — these are contract terms, not implementation details
- Error response bodies — consumers parse error messages; changing their structure is a breaking change
- Pagination contracts — page size limits, cursor formats, and total-count fields are part of the interface

Contract tests belong in the same repository as the service they test and must run in CI on every change. A contract violation that reaches production is a regression.

### Coverage expectations
- Aim for meaningful coverage, not 100% line coverage for its own sake.
- Untested code that touches security, data integrity, or money requires a justification comment.

---

## Security

### Input validation
- Validate and sanitize all input at the point of entry. Never trust data from users, external APIs, or environment variables without validation.
- Use parameterized queries or ORM-level protections for all database access. Never interpolate user data into queries.
- Encode output appropriately for the context (HTML, SQL, shell, etc.) to prevent injection.

### Secrets management
- Never commit secrets, tokens, API keys, or credentials to source control.
- Reference secrets via environment variables or a secrets manager. Never hardcode them.
- If a secret is accidentally committed, treat it as compromised and rotate it immediately.

### Least privilege
- Request only the permissions a component actually needs.
- Scope tokens, roles, and service accounts as narrowly as possible.
- Avoid storing sensitive data you don't need.

### Dependencies
- Keep dependencies up to date. Outdated dependencies are a common attack surface.
- Audit new dependencies before adding them — prefer well-maintained libraries with narrow scope.
- Remove unused dependencies.

### OWASP awareness
- Be mindful of the OWASP Top 10 when writing code that handles authentication, authorization, data exposure, or user input.
- When in doubt about a security decision, surface the concern rather than guessing.

---

## Secure by Design

Security must be built in from the start, not added after the fact. The following principles apply at every layer — architecture, implementation, and configuration.

### Fail securely / deny by default
- When a security check fails, throws, or produces an unexpected result, the system must land in a **denied or closed state**, never an open one.
- Avoid patterns where an exception or missing value silently grants access.
- Authorization logic should explicitly grant access; anything not explicitly permitted is denied.

### Secure defaults
- Default configuration must be the most restrictive option available. Users and operators should opt in to permissiveness, not opt out of it.
- New features, flags, and endpoints should ship disabled or locked down by default.
- Never ship with debug modes, verbose logging, or admin backdoors enabled by default.

### Defense in depth
- Do not rely on a single security control. Layer independent controls so that the failure of one does not expose the system.
- Examples: validate at the API boundary *and* enforce at the service layer *and* restrict at the database level.
- Assume any individual control can be bypassed; design so that bypass alone is insufficient.

### No security by obscurity
- Security must not depend on hiding implementation details, endpoint paths, field names, or algorithm choices.
- Treat all internal logic as potentially visible to an attacker. Controls must hold even when the attacker knows how they work.
- Obscurity may be used as an *additional* layer but never as the *primary* control.

### Data minimization
- Only collect, store, and process the data actually required for the feature.
- Do not log, cache, or pass through fields you don't need — you cannot leak what you don't have.
- Apply retention limits: data that is no longer needed should be deleted.
- Mask or truncate sensitive values (card numbers, SSNs, tokens) wherever they appear outside their primary storage.

### No sensitive data in logs or errors
- Log messages, stack traces, and error responses must never contain passwords, tokens, API keys, PII, session identifiers, or internal file paths.
- Return generic error messages to callers; log the full detail server-side with a correlation ID.
- Before adding a log statement that includes request/response data, explicitly check whether it could contain sensitive fields.

### Audit logging
- Log all security-relevant events with enough context to support investigation:
  - Authentication attempts (success and failure), including source IP and user identifier
  - Authorization failures
  - Access to sensitive or regulated data
  - Privilege escalation or role changes
  - Configuration changes
- Audit logs must be tamper-evident and written to a location the application cannot modify after the fact.
- Do not log sensitive values in audit events — log identifiers and outcomes, not payloads.

---

## Observability & Logging

Good logging is what makes a system debuggable in production. Write logs for the engineer who is paged at 2am with no prior context — not for the developer who just wrote the code.

### Structured logging
- Log in a structured format (e.g., JSON) rather than free-form strings. Structured logs are searchable, filterable, and parseable by tooling.
- Include consistent fields across all log entries: `timestamp`, `level`, `service`, `correlation_id`, and `message` at a minimum.
- Do not concatenate dynamic values into message strings — use structured fields instead.

```
// Avoid
log.info("User " + userId + " placed order " + orderId);

// Prefer
log.info("Order placed", Map.of("userId", userId, "orderId", orderId));
```

### Log levels
Use log levels consistently and deliberately:

| Level | Use for |
|---|---|
| `ERROR` | Failures that require immediate attention or indicate data loss / system instability |
| `WARN` | Unexpected conditions the system recovered from, or degraded behavior |
| `INFO` | Normal, significant lifecycle events (service start, job complete, connection established) |
| `DEBUG` | Detail useful during development or targeted troubleshooting — must be off in production by default |
| `TRACE` | Fine-grained internals — never on in production |

Do not use `ERROR` for expected failure cases (e.g., a user entering a wrong password). Do not use `INFO` for high-frequency events that would flood logs under normal load.

### Correlation IDs
- Every inbound request must be assigned a unique correlation ID at the entry point.
- Propagate the correlation ID through all downstream calls, log entries, and error responses.
- Return the correlation ID to the caller in error responses so they can reference it in support requests.
- If an upstream correlation ID is provided (e.g., via a request header), preserve and use it rather than generating a new one.

### Log signal, not noise
- Log outcomes and decisions, not every step of execution.
- Avoid logging inside tight loops or high-frequency paths — aggregate instead.
- A log entry that always appears alongside another adds no information; eliminate the redundant one.
- Regularly review log volume. If a level produces so much output it obscures real events, it is miscalibrated.

### What not to log
- Sensitive data (passwords, tokens, PII, card numbers) — see Secure by Design.
- Full request/response payloads unless explicitly required for compliance and masked appropriately.
- Stack traces at `INFO` or below — stack traces belong at `ERROR` or `WARN` only.

---

## Architecture & Design

### Separation of concerns
- Each module, class, or function should have one clear responsibility.
- Keep business logic separate from infrastructure concerns (I/O, networking, persistence).
- Avoid leaking implementation details across layer boundaries.

### Dependencies
- Depend on abstractions, not concrete implementations, where the flexibility is genuinely needed.
- Avoid circular dependencies. If two modules need each other, extract a shared abstraction.
- Prefer explicit dependencies (passed as arguments) over implicit ones (global state, singletons).

### API design
- APIs should be easy to use correctly and hard to use incorrectly.
- Be conservative in what you expose. It is easier to add surface area than to remove it.
- Breaking changes to public interfaces require explicit versioning or migration paths.

### State management
- Minimize mutable shared state. Prefer immutable data structures where practical.
- Make state transitions explicit and traceable.
- Side effects should be isolated and clearly identified.

### Scalability & performance
- Don't optimize prematurely. Measure before tuning.
- Identify and address known bottlenecks (N+1 queries, unbounded memory growth, blocking I/O) as a baseline.
- Document non-obvious performance trade-offs in the code.

---

## Commit Standards

Use [Conventional Commits](https://www.conventionalcommits.org) format for all commit messages:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types:**

| Type | Use for |
|---|---|
| `feat` | New feature or user-facing capability |
| `fix` | Bug fix |
| `chore` | Maintenance, dependencies, config — no behavior change |
| `refactor` | Code restructuring — no behavior change, no bug fix |
| `test` | Adding or updating tests only |
| `docs` | Documentation only |
| `ci` | CI/CD pipeline changes |
| `perf` | Performance improvement |

**Rules:**
- Subject line: imperative mood, ≤72 characters, no trailing period (`add user login`, not `Added user login.`)
- Body: wrap at 72 characters; explain *why*, not *what*
- Breaking changes: append `!` to the type (`feat!: remove legacy auth endpoint`) and add a `BREAKING CHANGE:` footer
- Reference issues in the footer: `Closes ABC-123`

This format enables automated changelogs and makes `git log` scannable. Teams may substitute an alternative format by updating this section — but whichever format is chosen, apply it consistently across all commits in the repository.

---

## Branching Strategy

This project uses **trunk-based development**. All work happens on short-lived branches that merge directly into `main`. There are no long-lived feature branches, release branches, or develop branches.

### Rules
- Branch from `main`; merge back to `main`. The mainline is always deployable.
- Keep branches short-lived — ideally merged within one to two days. Long-running branches accumulate merge debt and make integration harder.
- Merge small, incremental changes rather than large batches. A branch that touches dozens of files is a sign of too much scope.
- Delete branches after merge. Stale branches are noise.

### Why trunk-based development
Long-lived branches delay integration feedback. Bugs and conflicts that would be caught immediately on `main` are discovered late — when they are more expensive to fix. Trunk-based development enforces continuous integration by keeping the team working close to the shared state of the codebase.

---

## Agent Workflow

These are mandatory procedural steps that must be followed for every task, in order.

### Step 1 — Ticket and branch setup (before any code changes)

**Always create a Jira ticket and move it to in-progress before touching the codebase.**

1. **After planning, create a Jira ticket** for the work if one does not already exist. Use the pipeline MCP server (`dispatch_story` / `ingest_plan`) to create and track it.
2. **Mark the ticket in-progress** (via `mark_story_in_progress`) before writing any code or tests.
3. **Create a new branch** tied to the ticket:

```
{type}/{JIRA-TICKET}
```

Where `{type}` reflects the nature of the work:

| Type | Use for |
|---|---|
| `feature` | New functionality |
| `bugfix` | Fixing a defect |
| `hotfix` | Urgent production fix |
| `chore` | Dependency updates, config changes, non-functional work |
| `refactor` | Code restructuring with no behavior change |
| `docs` | Documentation-only changes |

Examples: `feature/ABC-123`, `bugfix/PLAT-456`, `hotfix/INFRA-789`

**If a Jira ticket has not been provided and cannot be created:**
- Stop before making any changes.
- Ask the user: *"What is the Jira ticket and type of work for this task?"*
- Do not proceed until both the ticket and type are confirmed.
- If the user confirms there is no ticket, use `{type}/NO-TICKET` and note the exception.

### Step 2 — Diagnose before acting (bug work only)

**For bug fixes, understand the root cause before writing any code or tests.**

1. Read the relevant code paths end-to-end — do not guess at cause from symptoms alone.
2. Identify the exact line or condition responsible for the wrong behavior.
3. Reproduce the failure with a concrete example (a `curl`, a failing assertion, a log line).
4. State the root cause explicitly before proceeding. If you cannot pinpoint it, say so rather than trying a likely-looking fix.

Skip this step for new features where there is no pre-existing defect to diagnose.

### Step 3 — Write tests first (TDD)

Follow strict Test-Driven Development for all feature and bug-fix work:

1. **Understand the requirement** before writing any code. Ask clarifying questions if the behavior is ambiguous.
2. **Write failing tests** that define the expected behavior. Tests should fail at this point — that is correct.
3. **Confirm the tests fail for the right reason** (failing assertion, not a syntax error or import failure).
4. **Write the minimum implementation code** needed to make the tests pass. Do not write more than what the tests require.
5. **Refactor** if needed, keeping all tests green throughout.

Do not write implementation code before the tests exist. If you catch yourself writing implementation first, stop and write the test first.

#### Bug fixes: translate your diagnosis into a test

For bug work, Steps 2 and 3 are a deliberate hand-off. The diagnosis from Step 2 must become a test before any fix is written:

1. **Write a test that reproduces the exact failure identified in Step 2.** The test should call the same code path, with the same inputs that triggered the bug. It must fail — and fail *for the right reason* (the bug, not a missing import or bad test setup).
2. **Do not write the fix yet.** A passing test before the fix means the test is not actually exercising the bug.
3. **Write the minimum fix** needed to make the new test pass while keeping all existing tests green.
4. **The new test is now a permanent regression guard.** It lives alongside the fix and will catch any future reintroduction of the same defect.

This sequence matters: a bug that is fixed without a reproducing test will likely recur. A test written after the fix cannot be trusted — it was never observed failing.

### Step 4 — Protect existing tests

**Never modify an existing test without explicit user approval.**

If a change you are making would require altering an existing test:
- Stop before making the modification.
- Explain to the user: which test(s) would change, why the change is needed, and what the impact is.
- Wait for explicit confirmation before proceeding.

This applies to all test files — test logic, assertions, setup/teardown, test data, and test naming. Adding new test cases to an existing test file is permitted; modifying existing ones is not.

### Step 5 — Detect the test runner

**Do not assume a fixed test command. Detect the project's test runner before running tests.**

Inspect the project root for build/config files in this order:

| File found | Test command |
|---|---|
| `pom.xml` | `mvn test` |
| `build.gradle` or `build.gradle.kts` | `./gradlew test` |
| `package.json` | `npm test` (or `yarn test` if `yarn.lock` is present) |
| `Makefile` with a `test` target | `make test` |
| `pyproject.toml` / `setup.py` | `pytest` |
| `Cargo.toml` | `cargo test` |

The majority of projects in this organization are Maven-based (`pom.xml`). If multiple build files are found, prefer `pom.xml`. If no recognizable build file is found, ask the user how to run the tests before proceeding.

**Multi-project repositories:** When a repo contains more than one sub-project with its own build file (e.g., a Python API alongside an Angular frontend), run every test suite that your changes could affect — not just the one closest to the files you edited. A change to a shared contract, API response shape, or URL parameter can break both suites simultaneously, as they each validate different sides of the same boundary.

### Step 6 — Verify with the full test suite

**After implementation, run the full project test suite using the detected test runner.**

- All tests must pass. Do not consider the task done if any tests are failing.
- If a pre-existing test fails unrelated to your changes, stop and surface it to the user before proceeding.
- Report the test results (pass/fail counts) as part of your completion summary.

### Step 7 — Commit, push, and open a PR

**Once all tests are passing, stop and present a summary to the user before committing anything.**

The summary must include:
- The branch name that was created.
- A list of all files changed, with a one-line description of each change.
- The proposed commit message, formatted according to the project's **Commit Standards**.

Then ask:
*"All tests are passing. Please review the changes above. Shall I commit?"*

After the user confirms:
1. Commit and push the branch.
2. **Always open a pull request** — do not merge directly to master. The PR is the mandatory review gate; the user merges it manually.
3. Post the PR URL so the user can review and merge.

Do not merge, squash, or close the PR yourself. Wait for the user to merge it.

### Step 8 — Close the ticket after merge

**When the user confirms the PR has been merged, mark the Jira ticket done.**

Use `mark_story_done` via the pipeline MCP server immediately after the user says the PR merged. Do not mark a ticket done before the merge — a merged PR is the signal.

### Step 9 — Definition of Done

A task is not complete when the code is written. It is complete when all of the following are true:

- [ ] All new and existing tests pass
- [ ] A reproducing test exists and was observed failing before the fix (bug fixes only)
- [ ] A pull request has been opened and the URL shared with the user
- [ ] The PR has been merged by the user
- [ ] The Jira ticket has been marked done (via `mark_story_done`)
- [ ] No regressions in areas touched by the change — smoke-test the critical path if automated tests do not cover it
- [ ] Documentation is updated if the change alters externally visible behavior (API contracts, configuration, user-facing functionality)
- [ ] The commit message follows the project's **Commit Standards**

---

## Code Review

Code review is the last quality gate before code enters the shared codebase. Its purpose is to catch what tests cannot: design problems, unclear intent, missing edge cases, security concerns, and drift from team standards.

### What a reviewer is signing off on

Approving a pull request is a statement that the reviewer has verified all of the following:

- The change does what it claims to do
- Tests cover the new behavior, including negative and boundary cases
- No obvious security issues — injection, unvalidated input, exposed secrets, excessive permissions
- The implementation is consistent with the architecture and style of the surrounding code
- The commit message accurately describes the change

An approver who has not checked these items should not approve.

### Blocking vs. non-blocking feedback

Be explicit about the weight of your feedback so the author can prioritize:

| Label | Meaning |
|---|---|
| **Blocking** | Must be addressed before merge. The change is incorrect, unsafe, or violates a standard. |
| **Suggestion** | Worth considering but will not block merge. Author decides. |
| **Nit** | Minor style or wording preference. Author may ignore. |

Default to `Suggestion` when in doubt. Reserve `Blocking` for genuine problems — overusing it trains authors to discount all feedback.

### Pull request size

Small, focused pull requests are easier to review, less risky to merge, and produce more useful feedback.

- **Aim for PRs under 400 lines of changed code.** This is a guideline, not a hard limit — a well-scoped 600-line change is better than five artificial splits — but consistently large PRs indicate a scoping problem.
- **One concern per PR.** A PR that fixes a bug *and* refactors a module *and* updates dependencies is three PRs. Mixing concerns makes review harder and rollback nearly impossible.
- **Separate mechanical changes from behavioral ones.** Refactors, formatting fixes, and dependency updates should not be bundled with feature work. When something breaks, you need to identify which change caused it.
- If a task genuinely requires a large change, break it into a sequence of reviewable steps merged incrementally to `main`.

### Reviewing AI-generated code

AI-generated code requires the same scrutiny as human-written code. Additionally:

- Verify the AI did not add unrequested features, quietly remove behavior, or silently refactor adjacent code
- Check that tests were written before the implementation (per the Agent Workflow), not retrofitted after
- Be skeptical of plausible-looking code that has not been exercised against the actual system — AI can generate syntactically correct code that is logically wrong
- Security-sensitive changes (auth, payments, data access) require human review regardless of source or apparent quality

---

## Working with AI Assistance

When using Claude Code or similar tools in this codebase:

- **Scope requests tightly.** Ask for the specific change needed, not a broad rewrite.
- **Review all AI-generated code** as carefully as you would a peer's pull request.
- **Do not accept AI-generated code that adds unrequested features**, refactors adjacent code, or introduces speculative abstractions.
- **Security-sensitive changes** (auth, payments, data access) require human review regardless of source.
- **Generated code must pass the same standards** as hand-written code: tests, security review, and architectural fit.
