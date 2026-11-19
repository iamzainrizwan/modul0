// publishing a draft, in the order that keeps the live site whole: its images
// first (so the post never goes live pointing at missing ones), then the
// post, then the draft is deleted. the calls come in as `api`, so the order
// is tested without a browser (test/publish.test.mjs).
export type PublishApi = {
  image: (name: string) => Promise<unknown>; // commit one draft image
  post: () => Promise<string>; // commit the post, returns its sha
  dropDraft: () => Promise<unknown>; // delete the draft and its images from d1
};

// the post's sha once it's live, and whether the draft is gone. a failed
// delete doesn't fail the publish: the post is already on github, and the
// caller has to keep its sha or the next save is a conflict
export async function publish(api: PublishApi, images: string[], hasDraft: boolean, progress?: (i: number) => void) {
  for (const [i, name] of images.entries()) {
    progress?.(i);
    // a conflict means it's already there: a publish cut short (rate limit,
    // network) is being retried, and the names never repeat
    await api.image(name).catch((err) => {
      if ((err as { code?: string })?.code !== 'conflict') throw err;
    });
  }
  const sha = await api.post();
  let dropped = true;
  if (hasDraft) dropped = await api.dropDraft().then(() => true, () => false);
  return { sha, dropped };
}
