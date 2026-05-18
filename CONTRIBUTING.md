# Contributing to the Agentic Scheduling Profile

Thank you for your interest in contributing to ASP! This document explains the
contribution process and guidelines.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [RFC Process for Spec Changes](#rfc-process-for-spec-changes)
- [Pull Request Workflow](#pull-request-workflow)
- [Commit Message Convention](#commit-message-convention)
- [DCO Sign-Off](#dco-sign-off)
- [Development Setup](#development-setup)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project follows the [Contributor Covenant v2.1](CODE_OF_CONDUCT.md).
Please read it before participating.

## RFC Process for Spec Changes

Changes to the profile specification **must** go through the RFC process:

1. **Open an issue** describing the problem or feature you want to address.
2. **Fork the repo** and create a new RFC document under `rfcs/` using the
   template in `rfcs/0000-template.md`.
3. **Submit a PR** with the RFC in `draft` status. The PR title should be
   `RFC-NNNN: <short title>`.
4. **Community review** lasts a minimum of 14 days. Maintainers and community
   members provide feedback on the PR.
5. **Revise** based on feedback. Update the RFC status to `accepted` or
   `rejected` once consensus is reached.
6. **Implementation** may begin once an RFC is accepted. Reference the RFC
   number in any implementation PRs.

Small clarifications and typo fixes do not require an RFC.

## Pull Request Workflow

1. Fork the repository and create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-feature main
   ```
2. Make your changes. Ensure tests pass and schemas validate:
   ```bash
   npm run build
   npm run validate-schemas
   ```
3. Push your branch and open a Pull Request against `main`.
4. Fill in the PR template. Link any related issues or RFCs.
5. Address review feedback. Maintainers may request changes before merging.
6. Once approved, a maintainer will squash-merge your PR.

### PR Guidelines

- Keep PRs focused. One logical change per PR.
- Add or update tests for any new functionality.
- Update documentation if your change affects the public API or spec.
- Ensure CI checks pass before requesting review.

## Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

Format:

```
<type>(<scope>): <short summary>

<optional body>

<optional footer(s)>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`

**Scopes:** `spec`, `schema`, `server`, `adapter`, `docs`, or omit for broad changes.

Examples:

```
feat(schema): add cancellation_policy field to provider object
fix(server): handle timezone offset in slot lookup
docs: update README with quickstart instructions
chore: bump typescript to 5.6
```

## DCO Sign-Off

All commits **must** include a Developer Certificate of Origin sign-off line.
This certifies that you have the right to submit the contribution under the
project's license.

Add the sign-off automatically with:

```bash
git commit -s -m "feat(schema): add new field"
```

This appends the following to your commit message:

```
Signed-off-by: Your Name <your.email@example.com>
```

Commits without a valid DCO sign-off will be rejected by CI.

## Development Setup

```bash
git clone https://github.com/your-fork/mcp-scheduling-profile.git
cd mcp-scheduling-profile
npm install
npm run build
npm run validate-schemas
```

## Reporting Issues

- Use GitHub Issues for bugs, feature requests, and spec questions.
- Search existing issues before opening a new one.
- Provide as much context as possible: steps to reproduce, expected vs actual
  behavior, environment details.

---

Thank you for helping make ASP better!
