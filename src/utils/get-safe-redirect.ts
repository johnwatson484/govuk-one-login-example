// Only same origin, absolute paths are ever followed after signing in, so a
// crafted `redirect` query parameter cannot bounce the user to another site.
function getSafeRedirect (redirect: unknown): string {
  if (typeof redirect !== 'string' || redirect.length === 0) {
    return '/'
  }

  if (!redirect.startsWith('/')) {
    return '/'
  }

  // Protocol relative (`//host`) and backslash variants are treated as absolute by browsers.
  if (redirect.startsWith('//') || redirect.startsWith('/\\')) {
    return '/'
  }

  return redirect
}

export { getSafeRedirect }
