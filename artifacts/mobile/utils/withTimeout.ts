/** Bound startup IO without replacing unreadable saves with defaults. */
export async function withTimeout<T>(work: Promise<T>, ms = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Loading timed out. Please retry.')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
