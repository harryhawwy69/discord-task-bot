// Decides whether a pull request may stay open under the claim rule in
// CONTRIBUTING.md: an outside contributor must be assigned the issue before
// opening a pull request for it.
//
// Plain CommonJS with no dependencies, so the claim-check workflow can
// require() it from actions/github-script, and Vitest can test it.

/** A maintainer adds this label to a pull request to skip the check. */
const BYPASS_LABEL = 'maintainer-approved';

/** Repository permissions that count as the team. */
const TEAM_PERMISSIONS = ['admin', 'maintain', 'write'];

// "Fixes #12", "closes #12", "Resolves: #12". The same keywords GitHub uses
// to link a pull request to an issue.
const LINK_PATTERN = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\b\s*:?\s*#(\d+)/gi;

/**
 * The issue numbers a pull request description links with a closing keyword.
 * @param {string | null | undefined} body
 * @returns {number[]} unique numbers, in order of first mention
 */
function linkedIssueNumbers(body) {
  const numbers = [];
  for (const match of (body ?? '').matchAll(LINK_PATTERN)) {
    const number = Number(match[1]);
    if (!numbers.includes(number)) numbers.push(number);
  }
  return numbers;
}

/**
 * @param {object} input
 * @param {string} input.author login of the pull request author
 * @param {string} input.authorType "User" or "Bot"
 * @param {string} input.permission the author's repository permission
 * @param {string[]} input.labels label names on the pull request
 * @param {{ number: number, isPullRequest: boolean, assignees: string[] }[]} input.linkedIssues
 * @returns {{ ok: boolean, reason: string, issueNumbers: number[] }}
 */
function decideClaim({ author, authorType, permission, labels, linkedIssues }) {
  const issueNumbers = linkedIssues.filter((issue) => !issue.isPullRequest).map((issue) => issue.number);

  if (TEAM_PERMISSIONS.includes(permission)) return { ok: true, reason: 'team', issueNumbers };
  if (authorType === 'Bot') return { ok: true, reason: 'bot', issueNumbers };
  if (labels.includes(BYPASS_LABEL)) return { ok: true, reason: 'bypass-label', issueNumbers };
  if (issueNumbers.length === 0) return { ok: false, reason: 'no-linked-issue', issueNumbers };

  const authorLogin = author.toLowerCase();
  const claimed = linkedIssues.some(
    (issue) => !issue.isPullRequest && issue.assignees.some((login) => login.toLowerCase() === authorLogin)
  );
  return claimed
    ? { ok: true, reason: 'claimed', issueNumbers }
    : { ok: false, reason: 'not-assigned', issueNumbers };
}

const CONTRIBUTING_URL = 'https://github.com/philaconvalley/discord-task-bot/blob/main/CONTRIBUTING.md#making-a-change';
const DISCORD_URL = 'https://philaconvalley.com/discord';

/**
 * The comment posted before the workflow closes a pull request.
 * @param {{ reason: string, issueNumbers: number[] }} decision
 * @param {string} author
 * @returns {string}
 */
function closeMessage(decision, author) {
  const why =
    decision.reason === 'not-assigned'
      ? `This pull request links ${decision.issueNumbers.map((n) => `#${n}`).join(', ')}, but that issue is not assigned to you.`
      : 'This pull request does not link an issue with "Fixes #<number>".';

  return [
    `Thank you for your interest, @${author}.`,
    '',
    `${why} In this repository, contributors claim an issue before they open a pull request. We keep our open issues for members of the PhilaCon Valley community, so this pull request closes automatically.`,
    '',
    'To contribute:',
    '',
    '1. Find an open issue labeled `community`, or open a new issue.',
    '2. Comment on the issue to ask for it.',
    '3. Wait for a maintainer to assign the issue to you.',
    '4. Open your pull request with "Fixes #<number>" in the description.',
    '',
    `The full steps are in [CONTRIBUTING.md](${CONTRIBUTING_URL}). Questions? Ask us in [Discord](${DISCORD_URL}).`,
  ].join('\n');
}

module.exports = { BYPASS_LABEL, linkedIssueNumbers, decideClaim, closeMessage };
