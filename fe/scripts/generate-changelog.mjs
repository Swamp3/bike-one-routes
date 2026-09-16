#!/usr/bin/env node
// Prepends a new version section to fe/public/CHANGELOG.md, built from the
// commit subjects between --from and --to (git refs, --to defaults to HEAD).
// Run this as part of bumping fe/package.json's version:
//
//   node scripts/generate-changelog.mjs --from <git-ref>
//
// Without --from, the most recent `v*` tag is used as the boundary - tag the
// release after generating (`git tag v<version>`) so the next run has one to
// find automatically.
//
// --version <string> and --append exist for backfilling old releases after
// the fact (--version overrides the section header instead of reading
// package.json; --append adds the section at the end of the file instead of
// the top - run once per past release, oldest-remaining first, each after
// the newer entries already in the file):
//
//   node scripts/generate-changelog.mjs --from <ref> --to <ref> --version <string> --append
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const feDir = fileURLToPath(new URL('..', import.meta.url));
const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf-8')
);
const changelogPath = new URL('../public/CHANGELOG.md', import.meta.url);

function git(args) {
  return execSync(`git ${args}`, { cwd: feDir, encoding: 'utf-8' }).trim();
}

function flagValue(name) {
  const flagIndex = process.argv.indexOf(name);
  return flagIndex === -1 ? null : process.argv[flagIndex + 1];
}

function resolveFrom() {
  const explicit = flagValue('--from');
  if (explicit) return explicit;
  try {
    return git('describe --tags --abbrev=0 --match "v*"');
  } catch {
    throw new Error(
      'No previous v* tag found. Pass --from <git-ref> to bootstrap the first entry.'
    );
  }
}

const to = flagValue('--to') ?? 'HEAD';
const version = flagValue('--version') ?? packageJson.version;
const append = process.argv.includes('--append');

const TYPE_LABELS = {
  feat: 'Features',
  fix: 'Fixes',
  perf: 'Performance',
  refactor: 'Refactors',
  docs: 'Docs',
  chore: 'Chores',
  test: 'Tests',
  other: 'Other',
};
const TYPE_ORDER = Object.keys(TYPE_LABELS);

function parseSubject(subject) {
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?:\s*(.+)$/);
  if (!match) return { type: 'other', scope: null, text: subject };
  const [, type, scope, text] = match;
  return { type: TYPE_LABELS[type] ? type : 'other', scope, text };
}

const from = resolveFrom();
const subjects = git(`log --no-merges --pretty=format:%s ${from}..${to}`)
  .split('\n')
  .filter(Boolean);

if (subjects.length === 0) {
  console.log(`No commits between ${from} and ${to} - nothing to add.`);
  process.exit(0);
}

const grouped = new Map(TYPE_ORDER.map((type) => [type, []]));
for (const subject of subjects) {
  const { type, scope, text } = parseSubject(subject);
  grouped.get(type).push(scope ? `**${scope}:** ${text}` : text);
}

const date =
  to === 'HEAD'
    ? new Date().toISOString().slice(0, 10)
    : git(`log -1 --format=%as ${to}`);
let section = `## v${version} — ${date}\n\n`;
for (const type of TYPE_ORDER) {
  const items = grouped.get(type);
  if (items.length === 0) continue;
  section += `### ${TYPE_LABELS[type]}\n\n`;
  for (const item of items) section += `- ${item}\n`;
  section += '\n';
}

const existing = existsSync(changelogPath)
  ? readFileSync(changelogPath, 'utf-8').replace(/^# Changelog\n+/, '')
  : '';
writeFileSync(
  changelogPath,
  append ? `# Changelog\n\n${existing}${section}` : `# Changelog\n\n${section}${existing}`
);

console.log(`Wrote v${version} section to public/CHANGELOG.md (commits between ${from} and ${to}).`);
if (to === 'HEAD') {
  console.log(`After committing, tag the release: git tag v${version}`);
}
