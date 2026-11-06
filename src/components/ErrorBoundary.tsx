import React from 'react';
import { getLang, translate } from '@/i18n';
import { useT } from '@/hooks/useLang';

interface State { error: Error | null }

/** 页面级兜底：任何渲染异常都显示可读的错误，而不是黑屏。 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // 保留在控制台，方便排查
    console.error('[page error]', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className='mx-auto max-w-xl space-y-3 rounded-2xl border border-danger/30 bg-danger/10 p-5 text-[15px] text-danger'>
        <div className='font-display text-base font-semibold'>{translate(getLang(), '这个页面出错了')}</div>
        <p className='text-txt-muted'>{translate(getLang(), '已捕获异常，存档没有损坏。可以返回总览继续游戏。')}</p>
        <pre className='max-h-40 overflow-auto rounded-lg bg-black/30 p-2 text-[12px] text-txt-muted'>
          {this.state.error.message}
        </pre>
        <button
          type='button'
          className='rounded-lg bg-accent px-3 py-1.5 text-[13px] font-semibold text-ink-950'
          onClick={() => { window.location.hash = '#/'; this.setState({ error: null }); }}
        >
          {translate(getLang(), '返回总览')}
        </button>
      </div>
    );
  }
}