/** Device-local entry rules shared by the form and regression tests. */
export function validatePlayerName(value: string): string | null {
  const name = value.trim();
  if (name.length < 2) return 'Use at least 2 characters.';
  if (name.length > 16) return 'Use 16 characters or fewer.';
  if (!/^[a-zA-Z0-9_]+$/.test(name)) return 'Use letters, numbers and underscores only.';
  return null;
}

export function findSavedPlayer<T extends { username: string }>(
  value: string,
  players: readonly T[],
): T | undefined {
  const name = value.trim().toLowerCase();
  return players.find(player => player.username.toLowerCase() === name);
}

export function playerCreationError(
  value: string,
  players: readonly { username: string }[],
): string | null {
  const error = validatePlayerName(value);
  if (error) return error;
  if (findSavedPlayer(value, players)) {
    return 'That player already exists on this device. Open Saved players to continue.';
  }
  return null;
}
