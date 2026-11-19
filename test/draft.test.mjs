// the worker's last check before a commit to the public repo (api/src/draft.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDraft, imageTime } from '../api/src/draft.js';

const post = (fm, body = 'hello') => `---\ntitle: x\n${fm}\n---\n${body}\n`;

test('every way yaml says draft: true is a draft', () => {
  for (const fm of ['draft: true', 'draft: True', 'draft: TRUE', 'draft: true  # wip', '"draft": true', "'draft': true", 'draft:   true'])
    assert.equal(isDraft(post(fm)), true, fm);
  assert.equal(isDraft(post('draft: true').replace(/\n/g, '\r\n')), true, 'crlf');
});

test('published posts and the body are not', () => {
  for (const fm of ['draft: false', 'draft: trueish', '', 'drafty: true'])
    assert.equal(isDraft(post(fm)), false, fm);
  assert.equal(isDraft(post('', 'draft: true\n\n---\n')), false, 'in the body');
  assert.equal(isDraft('draft: true'), false, 'no frontmatter');
});

test('draft image names carry their upload time', () => {
  const now = Date.now();
  assert.equal(imageTime(`shot-${now.toString(36)}.webp`), now);
  assert.ok(Number.isNaN(imageTime('cat-bar.png')));
  assert.ok(Number.isNaN(imageTime('plain.png')));
});
