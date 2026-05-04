export function getApiBaseUrl() {
  return (
    import.meta.env.VITE_API_BASE_URL ??
    import.meta.env.VITE_SOCKET_URL ??
    window.location.origin
  );
}

export function toAbsoluteApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBaseUrl().replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
