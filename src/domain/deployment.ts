/** Non-secret deployment setting. Restrict PWA scope to this project's path. */
export function deploymentBase(value = '/'): string {
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(value)) throw new Error('部署路徑必須是含結尾斜線的絕對子目錄路徑。');
  return value;
}
