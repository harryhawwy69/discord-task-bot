import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { BYPASS_LABEL, linkedIssueNumbers, decideClaim, closeMessage } = require('../.github/scripts/claim-check.js');

function issue(number: number, assignees: string[] = [], isPullRequest = false) {
  return { number, assignees, isPullRequest };
}

const outsider = { author: 'new-person', authorType: 'User', permission: 'read', labels: [] as string[] };

describe('linkedIssueNumbers', () => {
  it('reads every closing keyword GitHub accepts', () => {
    const body = 'Fixes #1. closes #2, Resolved #3 and fix: #4';
    expect(linkedIssueNumbers(body)).toEqual([1, 2, 3, 4]);
  });

  it('ignores a plain mention with no closing keyword', () => {
    expect(linkedIssueNumbers('Related to #7, see also #8')).toEqual([]);
  });

  it('lists a number once when the body repeats it', () => {
    expect(linkedIssueNumbers('Fixes #5\n\nFixes #5')).toEqual([5]);
  });

  it('handles an empty description', () => {
    expect(linkedIssueNumbers(null)).toEqual([]);
    expect(linkedIssueNumbers('')).toEqual([]);
  });
});

describe('decideClaim', () => {
  it('lets the team through without a linked issue', () => {
    for (const permission of ['admin', 'maintain', 'write']) {
      expect(decideClaim({ ...outsider, permission, linkedIssues: [] }).ok).toBe(true);
    }
  });

  it('lets bot accounts through, such as Dependabot', () => {
    expect(decideClaim({ ...outsider, authorType: 'Bot', linkedIssues: [] })).toMatchObject({ ok: true, reason: 'bot' });
  });

  it('lets a pull request with the bypass label through', () => {
    const decision = decideClaim({ ...outsider, labels: [BYPASS_LABEL], linkedIssues: [] });
    expect(decision).toMatchObject({ ok: true, reason: 'bypass-label' });
  });

  it('closes a pull request that links no issue', () => {
    expect(decideClaim({ ...outsider, linkedIssues: [] })).toMatchObject({ ok: false, reason: 'no-linked-issue' });
  });

  it('closes a pull request for an issue assigned to nobody', () => {
    const decision = decideClaim({ ...outsider, linkedIssues: [issue(17)] });
    expect(decision).toEqual({ ok: false, reason: 'not-assigned', issueNumbers: [17] });
  });

  it('closes a pull request for an issue assigned to someone else', () => {
    const decision = decideClaim({ ...outsider, linkedIssues: [issue(17, ['someone-else'])] });
    expect(decision.ok).toBe(false);
  });

  it('keeps a pull request for an issue assigned to the author, in any letter case', () => {
    const decision = decideClaim({ ...outsider, linkedIssues: [issue(17, ['New-Person'])] });
    expect(decision).toMatchObject({ ok: true, reason: 'claimed' });
  });

  it('keeps a pull request when any one of its linked issues is claimed', () => {
    const decision = decideClaim({ ...outsider, linkedIssues: [issue(17), issue(18, ['new-person'])] });
    expect(decision.ok).toBe(true);
  });

  it('does not count a linked pull request as a claimed issue', () => {
    const decision = decideClaim({ ...outsider, linkedIssues: [issue(23, ['new-person'], true)] });
    expect(decision).toMatchObject({ ok: false, reason: 'no-linked-issue' });
  });
});

describe('closeMessage', () => {
  it('names the unassigned issue and the steps to claim one', () => {
    const text = closeMessage({ reason: 'not-assigned', issueNumbers: [17] }, 'new-person');
    expect(text).toContain('@new-person');
    expect(text).toContain('links #17, but that issue is not assigned to you');
    expect(text).toContain('Wait for a maintainer to assign the issue to you');
  });

  it('asks for a linked issue when there is none', () => {
    const text = closeMessage({ reason: 'no-linked-issue', issueNumbers: [] }, 'new-person');
    expect(text).toContain('does not link an issue');
  });
});
