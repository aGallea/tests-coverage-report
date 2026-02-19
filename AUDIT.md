# Project Audit — tests-coverage-report

> Generated: 2026-02-17
> Last updated: 2026-02-18
> Status: P0 complete (PR #63 merged). P1 complete. P2 complete. P3 pending.
> Usage: Check off items as they are implemented. Reference item IDs when requesting fixes.

---

## P0 — Critical ✅

### [x] P0-1: Upgrade `action.yml` from node16 to node20

- **File**: `action.yml` (line 70)
- **Issue**: `using: node16` — GitHub deprecated node16 runners. The action will fail or already fails on newer GitHub-hosted runners.
- **Fix**: Change `using: 'node16'` to `using: 'node20'`. Verify runtime compatibility (project already develops on Node 22).
- **Risk**: Low — Node 20 is backward-compatible for this codebase.
- **Done**: PR #63 — `fix: upgrade GitHub Action runtime from node16 to node20`

### [x] P0-2: Fix shell injection in `diffCover.ts` and `utils.ts`

- **Files**: `src/utils.ts` (lines 11-27), `src/diffCover.ts` (lines 17, 47)
- **Issue**: Branch names and file paths are interpolated directly into shell commands via `exec()`. A malicious PR branch name like `` `rm -rf /` `` or `$(evil)` can execute arbitrary commands.
- **Fix**: Use `child_process.execFile()` with argument arrays instead of string interpolation, or sanitize/escape all inputs before passing to `exec()`.
- **Risk**: Medium — requires changing the exec utility pattern used across diffCover.
- **Done**: PR #63 — `fix(security): add shell-safe execFileCommand` + `fix(security): migrate diffCover to safe exec`

---

## P1 — High Priority

### [x] P1-1: Upgrade outdated npm dependencies

- **File**: `package.json`
- **Issue**: 23 outdated packages, 27 vulnerabilities (4 low, 11 moderate, 12 high). Key upgrades:
  - `@actions/core` 1.10.1 → 1.11.1 (minor, but 1.x is ancient)
  - `@actions/github` 5.1.1 → 6.0.0+ (major — API changes)
  - `xml2js` 0.5.0 → 0.6.2
  - `@vercel/ncc` 0.36.1 → 0.38.3
  - `eslint` 9.9.1 → 9.20.0
  - `jest` 29.7.0 (current, but `ts-jest` and `@types/jest` need bumps)
- **Fix**: Run `npm update` for minor/patch, then manually upgrade majors with testing.
- **Risk**: High for `@actions/github` major bump (API changes). Low-medium for others.
- **Done**: `fix: upgrade @actions/github to v6 and xml2js to v0.6` + `chore: update dev dependencies` + `chore: upgrade @vercel/ncc from 0.36 to 0.38`. Conservative approach — skipped ESM-only packages (@actions/core v3, @actions/github v9). Remaining vulns are in dev-only transitive deps (eslint/ajv, semantic-release/npm/tar).

### [x] P1-2: Fix pagination bug in `changedFiles.ts`

- **File**: `src/changedFiles.ts` (line 30)
- **Issue**: Pagination check uses `data.total_commits > 250` to decide if more file pages exist. This is wrong — `total_commits` counts commits, not files. A PR with 1 commit but 300 changed files would miss files after the first page.
- **Fix**: Check `data.files.length >= per_page` or use the octokit pagination helper.
- **Risk**: Low — straightforward logic fix.
- **Done**: `fix: paginate changedFiles by file count, not commit count (P1-2)`

### [x] P1-3: Fix Clover parser `forEach` bug

- **File**: `src/parsers/clover.ts` (lines 10, 42)
- **Issue**: `packages.forEach(parseFileObject)` passes `(element, index, array)` to `parseFileObject(packageObj, packageName)`. The `index` (a number) is used as `packageName`, causing incorrect package naming in coverage output.
- **Fix**: Change to `packages.forEach((pkg) => parseFileObject(pkg, pkg.$.name))` or similar explicit call.
- **Risk**: Low — isolated parser fix. Existing tests have commented-out assertions that would catch this.
- **Done**: `fix: pass correct packageName in clover parser forEach (P1-3)`

### [x] P1-4: `index.ts` never calls `core.setFailed()`

- **File**: `src/index.ts` (line 9)
- **Issue**: The catch block calls `core.error(error.message)` but not `core.setFailed()`. This means the action always exits successfully even when it throws, giving false green checks on PRs.
- **Fix**: Replace `core.error()` with `core.setFailed()` in the catch block (or add `core.setFailed()` after `core.error()`).
- **Risk**: Low — one-line fix.
- **Done**: `fix: call core.setFailed() in index.ts catch block (P1-4)`

### [x] P1-5: Unchecked `diffcoverRef` input cast in `eventInfo.ts`

- **File**: `src/eventInfo.ts` (line 25)
- **Issue**: `core.getInput('diffcoverRef') as 'merge' | 'head'` — this cast is unchecked. If the user passes an invalid value (e.g., `diffcoverRef: 'main'`), it silently proceeds and produces incorrect diff coverage results.
- **Fix**: Validate the input and throw/warn if it's not a valid `DiffCoverRef` value. Default to `'cobertura'` if invalid.
- **Risk**: Low — input validation addition.
- **Done**: `fix: validate diffcoverRef input with fallback to cobertura (P1-5)`

---

## P2 — Medium Priority

### [x] P2-1: Upgrade TypeScript 4.9 to 5.x

- **File**: `package.json`, `tsconfig.json`
- **Issue**: TypeScript 4.9.5 is outdated. TS 5.x brings better type inference, decorators, `satisfies`, and performance improvements.
- **Fix**: `npm install typescript@latest --save-dev`, fix any new type errors.
- **Risk**: Medium — may surface new strict-mode errors, but project already compiles cleanly.
- **Done**: `chore: upgrade TypeScript from 4.9 to 5.8 (P2-1)` — upgraded to typescript ~5.8.0 (5.8.3). Zero type errors, all tests pass, ncc bundle remains CommonJS.

### [x] P2-2: Fix test mock bug — `getBooleanInput` returns string

- **File**: `test/actions.spy.ts`
- **Issue**: `getBooleanInput` is mocked to return `'false'` (a string), which is truthy in JavaScript. Tests pass but don't reflect real behavior. `@actions/core`'s real `getBooleanInput` returns actual `boolean`.
- **Fix**: Mock should return `false` (boolean). Review all tests that depend on this mock.
- **Risk**: Low — may cause some tests to fail (revealing real bugs).
- **Done**: `test: add missing boolean inputs to getBooleanInput mock (P2-2)` — added `show-diffcover`, `fail-under-coverage-percentage`, `show-failures-info`, `override-comment` to `defaultInputs` with correct boolean defaults.

### [x] P2-3: Add input validation for `allFiles[file.status]` in `changedFiles.ts`

- **File**: `src/changedFiles.ts` (line 33)
- **Issue**: `allFiles[file.status]` uses dynamic property access. If GitHub API returns an unexpected status value, it silently creates a new array property instead of handling it.
- **Fix**: Add a type guard or allowlist for valid status values (`added`, `modified`, `removed`, `renamed`, `changed`, `unchanged`, `copied`).
- **Risk**: Low — defensive coding addition.
- **Done**: `fix: validate file.status before indexing in changedFiles (P2-3)` — added type guard to cast and validate `file.status` against `FilesStatus` keys before indexing. Added test for unknown status.

### [x] P2-4: Expand test coverage

- **Files**: `test/` directory
- **Issue**: Missing coverage for:
  - `changedFiles.ts` pagination logic
  - Error paths in all parsers
  - `diffCover.ts` edge cases
  - `commentCoverage.ts` various report formats
  - Non-cobertura parser integration paths in `main.ts`
- **Fix**: Add targeted test cases for uncovered paths.
- **Risk**: Low — additive only.
- **Done**: `test: expand test coverage for changedFiles and eventInfo (P2-4)` — added empty files response test for `changedFiles` and boolean input type validation test for `eventInfo`.

### [x] P2-5: Uncomment and fix Clover test assertions

- **File**: `test/parsers/clover.test.ts` (lines 27-32, 45-52)
- **Issue**: Several assertions are commented out, likely because they fail due to the P1-3 forEach bug.
- **Fix**: Fix P1-3 first, then uncomment and verify assertions pass.
- **Risk**: Low — depends on P1-3.
- **Done**: `test: uncomment and fix clover parser assertions (P2-5)` — uncommented both assertion blocks, fixed expected values to match actual parser output (fixture has no method-type lines or branch data, so functions/branches are `{found: 0, hit: 0, details: []}`).

---

## P3 — Low Priority (Cleanup)

### [ ] P3-1: Consider migrating xml2js to fast-xml-parser

- **Files**: All parsers in `src/parsers/`
- **Issue**: xml2js is effectively unmaintained (last meaningful update 2023, issues piling up). `fast-xml-parser` is actively maintained, faster, and has better TypeScript support.
- **Fix**: Replace `xml2js.parseString` with `fast-xml-parser` across all XML parsers. Update unpackage functions for new parse tree shape.
- **Risk**: High — touches all parsers, requires extensive test updates. Should be done as a standalone effort.

### [ ] P3-2: Deduplicate XML parser boilerplate

- **Files**: `src/parsers/cobertura.ts`, `junit.ts`, `jacoco.ts`, `clover.ts`
- **Issue**: All 4 XML parsers duplicate the same pattern: read file → parseString → unpackage → resolve/reject. Only `unpackage()` differs.
- **Fix**: Extract a shared `parseXmlFile(path, unpackageFn)` utility.
- **Risk**: Low — refactoring only, covered by existing tests.

### [ ] P3-3: Fix typos

- **Files**:
  - `src/commentCoverage.ts` line 75: `"Succees"` → `"Success"`
  - `package.json` line 26: `"cubertura"` → `"cobertura"` in keywords
- **Fix**: Simple string replacements.
- **Risk**: None.

### [ ] P3-4: Remove dead code and commented debug logs

- **Files**: Multiple source files (11 instances of commented `console.log`, `core.info`, etc.)
- **Issue**: Leftover debug statements clutter the codebase.
- **Fix**: Remove all commented-out logging/debug lines.
- **Risk**: None.

### [ ] P3-5: Clean up tsconfig.json

- **File**: `tsconfig.json`
- **Issue**:
  - Test files are included in compilation (no separate tsconfig for tests)
  - Partial strict mode — `strict: false` but individual strict flags enabled
  - `outDir` set but unused (ncc bundles directly)
- **Fix**: Add `tsconfig.build.json` that excludes tests, or add `exclude: ["test"]`. Consider enabling `strict: true`.
- **Risk**: Low — may surface new type errors if enabling strict.

### [ ] P3-6: Clean up jest.config.ts

- **File**: `jest.config.ts`
- **Issue**: File is mostly commented-out boilerplate. Missing `collectCoverageFrom` (coverage collected but not scoped).
- **Fix**: Remove boilerplate comments, add `collectCoverageFrom: ['src/**/*.ts']`.
- **Risk**: None.

### [ ] P3-7: Fix pre-commit config issues

- **File**: `.pre-commit-config.yaml`
- **Issues**:
  - ESLint mirror plugin versions don't match installed versions (pre-commit may use different lint rules than local dev).
  - `check-jsonschema` Renovate hook uses `--disable-format` (should be `--disable-formats`), causing validation to fail.
  - `default_stages` uses deprecated stage name `commit` (should be `pre-commit`). Run `pre-commit migrate-config` to auto-fix.
  - ESLint hook catches `.releaserc.js` (CJS file using `module`) but env not configured for CommonJS globals.
  - `jest.integration.config.ts` not covered by ESLint config — triggers "no matching configuration" warning.
- **Fix**: Update ESLint plugin versions, fix `--disable-formats` typo, migrate config, add `.releaserc.js` to ESLint excludes or add CJS env, extend ESLint config to cover integration config.
- **Risk**: Low.

---

## Implementation Notes

- **P0 is complete** — merged in PR #63. Includes node20 upgrade, shell injection fix, smoke tests, and act-js E2E scaffold.
- **P1-2 through P1-5 are complete** — on branch `fix/p1-bugfixes`. P1-1 (npm upgrades) deferred as highest-risk item.
- **Pre-existing test failure**: `test/main.test.ts` has 2 failing tests on master (not caused by P1 changes). The "empty content" and "exception" tests mock incorrectly — `main()` reads cobertura.xml before reaching the mocked code path.
- **Dependency order**: P1-3 should be done before P2-5 (clover bug fix enables test assertions).
- **P1 items are independent** — can be done in parallel (except P1-1 npm upgrades which may affect others).
- **P1-1 (npm upgrades)** is the riskiest — `@actions/github` major bump may require API call changes in `changedFiles.ts` and `commentCoverage.ts`.
- **P3-1 (xml2js migration)** is the largest effort — save for last or do as a separate initiative.
- After any fix, run: `npm run build && npm test && npm run package`
