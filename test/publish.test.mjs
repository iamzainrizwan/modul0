// the publish order (src/scripts/admin/publish.ts): images, then the post,
// then the draft; a failed draft delete still hands back the live post's sha
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publish } from '../src/scripts/admin/publish.ts';

const fake = (fail = {}) => {
  const calls = [];
  const step = (name, out) => async (arg) => {
    calls.push(arg ? `${name}:${arg}` : name);
    if (fail[name]) throw fail[name];
    return out;
  };
  return { calls, api: { image: step('image'), post: step('post', 'sha1'), dropDraft: step('drop') } };
};

test('images go up before the post, the draft goes last', async () => {
  const { calls, api } = fake();
  assert.deepEqual(await publish(api, ['a.webp', 'b.webp'], true), { sha: 'sha1', dropped: true });
  assert.deepEqual(calls, ['image:a.webp', 'image:b.webp', 'post', 'drop']);
});

test('a failed draft delete still returns the sha', async () => {
  const { calls, api } = fake({ drop: new Error('network') });
  assert.deepEqual(await publish(api, [], true), { sha: 'sha1', dropped: false });
  assert.deepEqual(calls, ['post', 'drop']);
});

test('an image already there (a retried publish) is fine; any other failure stops before the post', async () => {
  assert.equal((await publish(fake({ image: { code: 'conflict' } }).api, ['a.webp'], false)).sha, 'sha1');
  const { calls, api } = fake({ image: { code: 'server' } });
  await assert.rejects(publish(api, ['a.webp'], true));
  assert.deepEqual(calls, ['image:a.webp']);
});
