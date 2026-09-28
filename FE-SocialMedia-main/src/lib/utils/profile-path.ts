/** Profile route for a user id; undefined when id is missing. */
export function getProfileHref(userId: string | undefined) {
  const id = userId?.trim();

  if (!id) {
    return undefined;
  }

  return `/profile/${id}`;
}
