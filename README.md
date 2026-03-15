# AccessScore

**Instant ADA & WCAG accessibility compliance checker for any website.**

Scan any URL from the command line and get an accessibility score, legal risk assessment, and actionable issues with WCAG references. No browser required.

[![npm version](https://img.shields.io/npm/v/accessscore.svg)](https://www.npmjs.com/package/accessscore)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

## Why AccessScore?

- **4,000+ ADA lawsuits** were filed in 2024 alone targeting inaccessible websites
- Average settlement cost: **$25,000 - $75,000** for small businesses
- 96.3% of home pages have detectable WCAG failures (WebAIM Million 2024)
- Fixing accessibility issues early is 10x cheaper than remediating after a lawsuit

AccessScore gives you a fast, free scan so you know where you stand before a plaintiff's attorney does.

## Installation

```bash
# Run directly (no install)
npx accessscore https://your-site.com

# Or install globally
npm install -g accessscore
accessscore https://your-site.com
```

Requires **Node.js 18+** (uses built-in fetch).

## Usage

### Basic scan

```bash
accessscore https://example.com
```

### Output example

```
  AccessScore Report
  ==================

  URL:    https://example.com
  Score:  72/100 (C)
  Risk:   MODERATE — Estimated exposure: $10,000 - $50,000

  Top Issues:
  ──────────────────────────────────────────
  1. CRITICAL: 3 images missing alt text
     WCAG 1.1.1 Non-text Content (Level A)

  2. SERIOUS: Page missing skip navigation link
     WCAG 2.4.1 Bypass Blocks (Level A)

  3. SERIOUS: 2 form inputs missing associated labels
     WCAG 1.3.1 Info and Relationships (Level A)

  4. MODERATE: Heading hierarchy skips from h1 to h3
     WCAG 1.3.1 Info and Relationships (Level A)

  5. MINOR: Missing ARIA landmark regions
     WCAG 1.3.1 Info and Relationships (Level A)

  Total: 12 issues found (3 critical, 2 serious, 5 moderate, 2 minor)

  Get full report with fixes at https://accessscore.autonomous-claude.com
```

### Exit codes

- `0` — Score >= 70 (pass)
- `1` — Score < 70 (fail)

This makes AccessScore perfect for CI/CD pipelines — fail builds when accessibility degrades.

## What It Checks

AccessScore runs 12 automated checks covering WCAG 2.1 Level A and AA criteria:

| Check | WCAG Criterion | Severity |
|-------|---------------|----------|
| Images without `alt` text | 1.1.1 Non-text Content | Critical |
| Missing `lang` attribute on `<html>` | 3.1.1 Language of Page | Serious |
| Missing page `<title>` | 2.4.2 Page Titled | Serious |
| Heading hierarchy (skipped levels) | 1.3.1 Info and Relationships | Moderate |
| Form inputs without labels | 1.3.1 Info and Relationships | Serious |
| Missing meta viewport | 1.4.4 Resize Text | Moderate |
| Links without accessible text | 2.4.4 Link Purpose | Critical |
| Missing skip navigation link | 2.4.1 Bypass Blocks | Serious |
| Low contrast indicators (inline styles) | 1.4.3 Contrast (Minimum) | Moderate |
| Missing ARIA landmark regions | 1.3.1 Info and Relationships | Minor |
| Tables without headers | 1.3.1 Info and Relationships | Serious |
| Empty buttons or links | 4.1.2 Name, Role, Value | Critical |

## Score Calculation

The score starts at 100 and deductions are weighted by severity:

- **Critical** issues: -8 points each
- **Serious** issues: -5 points each
- **Moderate** issues: -3 points each
- **Minor** issues: -1 point each

### Grades

| Score | Grade | Meaning |
|-------|-------|---------|
| 90-100 | A | Excellent — minimal accessibility risk |
| 80-89 | B | Good — minor issues to address |
| 70-79 | C | Fair — several issues need attention |
| 60-69 | D | Poor — significant accessibility barriers |
| 0-59 | F | Failing — major compliance gaps, high legal risk |

## Legal Risk Tiers

AccessScore estimates legal exposure based on the number and severity of issues found:

| Tier | Criteria | Estimated Exposure |
|------|----------|--------------------|
| LOW | Score >= 90 | Minimal |
| MODERATE | Score 70-89 | $10,000 - $50,000 |
| HIGH | Score 50-69 | $25,000 - $75,000 |
| CRITICAL | Score < 50 | $50,000 - $150,000+ |

*These estimates are based on publicly reported ADA settlement data and are for informational purposes only. They do not constitute legal advice.*

## CI/CD Integration

### GitHub Actions

```yaml
name: Accessibility Check
on: [push, pull_request]

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - name: Check accessibility
        run: npx accessscore https://your-staging-site.com
```

### GitLab CI

```yaml
accessibility:
  image: node:18
  script:
    - npx accessscore https://your-staging-site.com
  allow_failure: false
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-push
npx accessscore https://localhost:3000
```

### npm Scripts

```json
{
  "scripts": {
    "a11y": "accessscore https://your-site.com",
    "a11y:staging": "accessscore https://staging.your-site.com"
  }
}
```

## Full Web Report

The CLI gives you a quick snapshot. For a comprehensive report with:

- Detailed fix instructions for every issue
- Code snippets showing exactly what to change
- Priority-ranked remediation plan
- PDF export for stakeholders
- Ongoing monitoring

Visit **[accessscore.autonomous-claude.com](https://accessscore.autonomous-claude.com)**

## Limitations

AccessScore performs static HTML analysis. It does not:

- Execute JavaScript (won't catch issues in SPAs that render client-side)
- Test keyboard navigation
- Verify actual color contrast ratios (only detects inline style indicators)
- Test with screen readers
- Check PDF or media accessibility
- Replace manual testing by users with disabilities

For full compliance, combine AccessScore with manual testing and user research.

## Contributing

Issues and pull requests are welcome at [github.com/ryuno2525/autonomous-claude-agent](https://github.com/ryuno2525/autonomous-claude-agent).

## License

MIT
