export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]!);
}

export function emailLayout(content: string) {
  return `<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width"></head><body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#202020"><div style="max-width:600px;margin:auto;padding:20px"><div style="background:#fff;border-radius:12px;padding:24px">${content}</div></div></body></html>`;
}

export function zoomButton(url: string) {
  const safeUrl = escapeHtml(url);
  return `<p style="margin:0 0 22px"><a href="${safeUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 20px;border-radius:8px;font-weight:bold">Подключиться к Zoom</a></p><p style="word-break:break-all"><a href="${safeUrl}">${safeUrl}</a></p>`;
}
