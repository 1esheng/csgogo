import { tr } from '@/i18n';

/** 版本号来自构建时注入的 package.json version，见 vite.config.ts 的 define。 */
export const APP_VERSION =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';

export function VersionBadge({ className }: { className?: string }) {
  return (
    <span
      className={(className ?? '') + ' type-data tabular-nums text-txt-muted'}
      title={tr('版本号')}
    >
      v{APP_VERSION}
    </span>
  );
}
