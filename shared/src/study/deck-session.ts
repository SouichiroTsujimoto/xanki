export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function shuffleIds(ids: string[]): string[] {
  return shuffleArray(ids);
}

export function shuffleReviewQueue<T>(items: T[], shuffle: boolean): T[] {
  return shuffle ? shuffleArray(items) : [...items];
}
