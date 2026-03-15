#!/usr/bin/env node

import chalk from 'chalk';
import * as cheerio from 'cheerio';

// ─── Constants ───────────────────────────────────────────────────────────────

const SEVERITY = {
  CRITICAL: { label: 'CRITICAL', weight: 8, color: 'red' },
  SERIOUS:  { label: 'SERIOUS',  weight: 5, color: 'yellow' },
  MODERATE: { label: 'MODERATE', weight: 3, color: 'cyan' },
  MINOR:    { label: 'MINOR',    weight: 1, color: 'gray' },
};

const FULL_REPORT_URL = 'https://accessscore.autonomous-claude.com';

// ─── Issue Definitions ───────────────────────────────────────────────────────

function runChecks($) {
  const issues = [];

  // 1. Images without alt text (WCAG 1.1.1)
  const imgsNoAlt = $('img').filter((_, el) => {
    const alt = $(el).attr('alt');
    return alt === undefined || alt === null;
  });
  if (imgsNoAlt.length > 0) {
    issues.push({
      severity: SEVERITY.CRITICAL,
      count: imgsNoAlt.length,
      message: `${imgsNoAlt.length} image${imgsNoAlt.length > 1 ? 's' : ''} missing alt text`,
      wcag: '1.1.1 Non-text Content (Level A)',
    });
  }

  // 2. Missing lang attribute on <html> (WCAG 3.1.1)
  const htmlLang = $('html').attr('lang');
  if (!htmlLang || htmlLang.trim() === '') {
    issues.push({
      severity: SEVERITY.SERIOUS,
      count: 1,
      message: 'Page missing lang attribute on <html> element',
      wcag: '3.1.1 Language of Page (Level A)',
    });
  }

  // 3. Missing page title (WCAG 2.4.2)
  const title = $('title').text().trim();
  if (!title) {
    issues.push({
      severity: SEVERITY.SERIOUS,
      count: 1,
      message: 'Page missing <title> element',
      wcag: '2.4.2 Page Titled (Level A)',
    });
  }

  // 4. Heading hierarchy — skipped levels (WCAG 1.3.1)
  const headings = [];
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    headings.push(parseInt(el.tagName.replace('h', ''), 10));
  });
  let skippedLevels = [];
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] > headings[i - 1] + 1) {
      skippedLevels.push(`h${headings[i - 1]} to h${headings[i]}`);
    }
  }
  if (skippedLevels.length > 0) {
    issues.push({
      severity: SEVERITY.MODERATE,
      count: skippedLevels.length,
      message: `Heading hierarchy skips: ${skippedLevels.join(', ')}`,
      wcag: '1.3.1 Info and Relationships (Level A)',
    });
  }

  // 5. Form inputs without labels (WCAG 1.3.1)
  const inputsWithoutLabels = $('input, select, textarea').filter((_, el) => {
    const $el = $(el);
    const type = ($el.attr('type') || '').toLowerCase();
    // Exclude hidden, submit, button, reset, image — they don't need labels
    if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) return false;

    const id = $el.attr('id');
    const ariaLabel = $el.attr('aria-label');
    const ariaLabelledBy = $el.attr('aria-labelledby');
    const title = $el.attr('title');

    // Check for associated label
    if (id && $(`label[for="${id}"]`).length > 0) return false;
    // Check for wrapping label
    if ($el.closest('label').length > 0) return false;
    // Check for ARIA
    if (ariaLabel || ariaLabelledBy || title) return false;

    return true;
  });
  if (inputsWithoutLabels.length > 0) {
    issues.push({
      severity: SEVERITY.SERIOUS,
      count: inputsWithoutLabels.length,
      message: `${inputsWithoutLabels.length} form input${inputsWithoutLabels.length > 1 ? 's' : ''} missing associated labels`,
      wcag: '1.3.1 Info and Relationships (Level A)',
    });
  }

  // 6. Missing meta viewport (WCAG 1.4.4)
  const viewport = $('meta[name="viewport"]');
  if (viewport.length === 0) {
    issues.push({
      severity: SEVERITY.MODERATE,
      count: 1,
      message: 'Page missing meta viewport tag',
      wcag: '1.4.4 Resize Text (Level AA)',
    });
  }

  // 7. Links without accessible text (WCAG 2.4.4)
  const linksNoText = $('a').filter((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const ariaLabel = $el.attr('aria-label');
    const ariaLabelledBy = $el.attr('aria-labelledby');
    const title = $el.attr('title');
    const imgAlt = $el.find('img[alt]').attr('alt');
    return !text && !ariaLabel && !ariaLabelledBy && !title && !imgAlt;
  });
  if (linksNoText.length > 0) {
    issues.push({
      severity: SEVERITY.CRITICAL,
      count: linksNoText.length,
      message: `${linksNoText.length} link${linksNoText.length > 1 ? 's' : ''} without accessible text`,
      wcag: '2.4.4 Link Purpose (Level A)',
    });
  }

  // 8. Missing skip navigation link (WCAG 2.4.1)
  const skipLink = $('a[href^="#"]').filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return text.includes('skip') || text.includes('jump to');
  });
  if (skipLink.length === 0) {
    issues.push({
      severity: SEVERITY.SERIOUS,
      count: 1,
      message: 'Page missing skip navigation link',
      wcag: '2.4.1 Bypass Blocks (Level A)',
    });
  }

  // 9. Low contrast indicators — inline styles with known-light colors (WCAG 1.4.3)
  const lightColorPattern = /color\s*:\s*(#(?:fff|fef|fdf|fce|fcf|eee|ddd|ccc|bbb|f[0-9a-f]{5}|e[0-9a-f]{5})|(?:white|whitesmoke|snow|ghostwhite|lightyellow|lightgray|lightgrey|gainsboro|ivory|linen|beige|seashell|oldlace|floralwhite|cornsilk|lemonchiffon|lavenderblush|mistyrose|papayawhip|blanchedalmond|antiquewhite))/i;
  const suspectContrast = $('[style]').filter((_, el) => {
    const style = $(el).attr('style') || '';
    return lightColorPattern.test(style);
  });
  if (suspectContrast.length > 0) {
    issues.push({
      severity: SEVERITY.MODERATE,
      count: suspectContrast.length,
      message: `${suspectContrast.length} element${suspectContrast.length > 1 ? 's' : ''} with potential low-contrast inline styles`,
      wcag: '1.4.3 Contrast Minimum (Level AA)',
    });
  }

  // 10. Missing ARIA landmark regions (WCAG 1.3.1)
  const landmarks = $('main, [role="main"], nav, [role="navigation"], header, [role="banner"], footer, [role="contentinfo"], aside, [role="complementary"]');
  if (landmarks.length === 0) {
    issues.push({
      severity: SEVERITY.MINOR,
      count: 1,
      message: 'No ARIA landmark regions found (main, nav, header, footer)',
      wcag: '1.3.1 Info and Relationships (Level A)',
    });
  }

  // 11. Tables without headers (WCAG 1.3.1)
  const tablesNoHeaders = $('table').filter((_, el) => {
    const $table = $(el);
    return $table.find('th').length === 0 && !$table.attr('role');
  });
  if (tablesNoHeaders.length > 0) {
    issues.push({
      severity: SEVERITY.SERIOUS,
      count: tablesNoHeaders.length,
      message: `${tablesNoHeaders.length} table${tablesNoHeaders.length > 1 ? 's' : ''} without header cells`,
      wcag: '1.3.1 Info and Relationships (Level A)',
    });
  }

  // 12. Empty buttons or links (WCAG 4.1.2)
  const emptyButtons = $('button').filter((_, el) => {
    const $el = $(el);
    const text = $el.text().trim();
    const ariaLabel = $el.attr('aria-label');
    const ariaLabelledBy = $el.attr('aria-labelledby');
    const title = $el.attr('title');
    const imgAlt = $el.find('img[alt]').attr('alt');
    return !text && !ariaLabel && !ariaLabelledBy && !title && !imgAlt;
  });
  if (emptyButtons.length > 0) {
    issues.push({
      severity: SEVERITY.CRITICAL,
      count: emptyButtons.length,
      message: `${emptyButtons.length} empty button${emptyButtons.length > 1 ? 's' : ''} (no accessible name)`,
      wcag: '4.1.2 Name, Role, Value (Level A)',
    });
  }

  return issues;
}

// ─── Score Calculation ───────────────────────────────────────────────────────

function calculateScore(issues) {
  let deductions = 0;
  for (const issue of issues) {
    deductions += issue.severity.weight * issue.count;
  }
  return Math.max(0, Math.min(100, 100 - deductions));
}

function getGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getRiskTier(score) {
  if (score >= 90) return { tier: 'LOW', exposure: 'Minimal', color: 'green' };
  if (score >= 70) return { tier: 'MODERATE', exposure: '$10,000 - $50,000', color: 'yellow' };
  if (score >= 50) return { tier: 'HIGH', exposure: '$25,000 - $75,000', color: 'red' };
  return { tier: 'CRITICAL', exposure: '$50,000 - $150,000+', color: 'redBright' };
}

function getGradeColor(grade) {
  switch (grade) {
    case 'A': return 'green';
    case 'B': return 'greenBright';
    case 'C': return 'yellow';
    case 'D': return 'red';
    case 'F': return 'redBright';
    default: return 'white';
  }
}

// ─── Display ─────────────────────────────────────────────────────────────────

function displayReport(url, score, grade, risk, issues) {
  const divider = chalk.gray('  ' + '\u2500'.repeat(50));

  console.log('');
  console.log(chalk.bold.white('  AccessScore Report'));
  console.log(chalk.bold.white('  =================='));
  console.log('');
  console.log(chalk.white('  URL:    ') + chalk.underline(url));
  console.log(
    chalk.white('  Score:  ') +
    chalk[getGradeColor(grade)].bold(`${score}/100`) +
    chalk.gray(` (${grade})`)
  );
  console.log(
    chalk.white('  Risk:   ') +
    chalk[risk.color].bold(risk.tier) +
    chalk.gray(` \u2014 Estimated exposure: ${risk.exposure}`)
  );

  if (issues.length === 0) {
    console.log('');
    console.log(chalk.green.bold('  No accessibility issues detected.'));
    console.log('');
  } else {
    console.log('');
    console.log(chalk.bold.white('  Top Issues:'));
    console.log(divider);

    // Sort by severity weight descending, then by count descending
    const sorted = [...issues].sort((a, b) => {
      if (b.severity.weight !== a.severity.weight) return b.severity.weight - a.severity.weight;
      return b.count - a.count;
    });

    const top = sorted.slice(0, 5);
    for (let i = 0; i < top.length; i++) {
      const issue = top[i];
      const severityStr = chalk[issue.severity.color].bold(issue.severity.label);
      console.log(`  ${i + 1}. ${severityStr}: ${issue.message}`);
      console.log(chalk.gray(`     WCAG ${issue.wcag}`));
      if (i < top.length - 1) console.log('');
    }

    // Totals
    const counts = { CRITICAL: 0, SERIOUS: 0, MODERATE: 0, MINOR: 0 };
    let total = 0;
    for (const issue of issues) {
      counts[issue.severity.label] += issue.count;
      total += issue.count;
    }
    console.log('');
    console.log(divider);
    console.log(
      chalk.white(`  Total: ${total} issue${total !== 1 ? 's' : ''} found (`) +
      chalk.red(`${counts.CRITICAL} critical`) + ', ' +
      chalk.yellow(`${counts.SERIOUS} serious`) + ', ' +
      chalk.cyan(`${counts.MODERATE} moderate`) + ', ' +
      chalk.gray(`${counts.MINOR} minor`) +
      chalk.white(')')
    );
  }

  console.log('');
  console.log(chalk.gray('  Get full report with fixes at ') + chalk.cyan.underline(FULL_REPORT_URL));
  console.log('');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  // Handle flags
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log('');
    console.log(chalk.bold('  AccessScore') + chalk.gray(' — ADA & WCAG accessibility checker'));
    console.log('');
    console.log(chalk.white('  Usage:'));
    console.log(chalk.gray('    $ accessscore <url>'));
    console.log('');
    console.log(chalk.white('  Examples:'));
    console.log(chalk.gray('    $ accessscore https://example.com'));
    console.log(chalk.gray('    $ npx accessscore https://your-site.com'));
    console.log('');
    console.log(chalk.white('  Options:'));
    console.log(chalk.gray('    -h, --help       Show this help message'));
    console.log(chalk.gray('    -v, --version    Show version number'));
    console.log('');
    console.log(chalk.gray(`  Full reports: ${FULL_REPORT_URL}`));
    console.log('');
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('accessscore 1.0.0');
    process.exit(0);
  }

  const url = args[0];

  // Validate URL
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }
  } catch {
    console.error(chalk.red(`  Error: "${url}" is not a valid URL.`));
    console.error(chalk.gray('  Provide a full URL like: https://example.com'));
    process.exit(1);
  }

  // Fetch the page
  console.log('');
  console.log(chalk.gray(`  Scanning ${url}...`));

  let html;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AccessScore/1.0 (https://accessscore.autonomous-claude.com; accessibility-checker)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    html = await response.text();
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(chalk.red('  Error: Request timed out after 15 seconds.'));
    } else {
      console.error(chalk.red(`  Error fetching URL: ${err.message}`));
    }
    process.exit(1);
  }

  // Parse and check
  const $ = cheerio.load(html);
  const issues = runChecks($);
  const score = calculateScore(issues);
  const grade = getGrade(score);
  const risk = getRiskTier(score);

  // Display
  displayReport(url, score, grade, risk, issues);

  // Exit code
  process.exit(score >= 70 ? 0 : 1);
}

main();
