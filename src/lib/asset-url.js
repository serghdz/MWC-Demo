// Works at the site root, a GitHub repository path, or a custom domain.
export function assetUrl(path) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}
