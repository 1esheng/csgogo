import { useRef, useState } from 'react';
import { useT } from '@/hooks/useLang';
import { AlertTriangle, Download, RotateCcw, Save, Upload } from 'lucide-react';
import { useGameStore } from '@/stores/gameStore';
import { Button, Modal } from '@/components/ui';

type Status = { kind: 'ok' | 'error'; text: string } | null;

export function SaveTools() {
  const { tr } = useT();
  const saveNow = useGameStore((s) => s.saveNow);
  const exportSave = useGameStore((s) => s.exportSave);
  const importSave = useGameStore((s) => s.importSave);
  const resetGame = useGameStore((s) => s.resetGame);
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleSave = async () => {
    setBusy(true);
    try {
      await saveNow();
      setStatus({ kind: 'ok', text: tr('存档已写入 IndexedDB。') });
    } catch {
      setStatus({ kind: 'error', text: tr('存档写入失败。') });
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const json = await exportSave();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'cs2-dynasty-save.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setStatus({ kind: 'ok', text: tr('已导出存档文件，共 ') + Math.round(json.length / 1024) + tr(' KB。') });
    } catch {
      setStatus({ kind: 'error', text: tr('导出失败。') });
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const result = await importSave(text);
      setStatus(result.ok ? { kind: 'ok', text: tr('存档已导入——') + file.name } : { kind: 'error', text: result.error ?? tr('导入被拒绝。') });
    } catch {
      setStatus({ kind: 'error', text: tr('无法读取该文件。') });
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  };

  return (
    <div className='space-y-2'>
      <Button className='w-full justify-start' variant='ghost' size='sm' disabled={busy} onClick={handleSave}>
        <Save size={14} /> {tr('立即保存')}
      </Button>
      <Button className='w-full justify-start' variant='ghost' size='sm' disabled={busy} onClick={handleExport}>
        <Download size={14} /> {tr('导出存档（JSON）')}
      </Button>
      <Button className='w-full justify-start' variant='ghost' size='sm' disabled={busy} onClick={() => fileRef.current?.click()}>
        <Upload size={14} /> {tr('导入存档')}
      </Button>
      <input ref={fileRef} type='file' accept='.json,application/json' className='hidden' onChange={handleFile} />
      <Button className='w-full justify-start' variant='outline' size='sm' disabled={busy} onClick={() => setConfirmReset(true)}>
        <RotateCcw size={14} /> {tr('重置存档…')}
      </Button>
      {status ? (
        <p
          className={
            status.kind === 'ok'
              ? 'rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-xs text-emerald-200'
              : 'rounded-lg border border-danger/30 bg-danger/10 px-2 py-1.5 text-xs text-danger'
          }
        >
          {status.text}
        </p>
      ) : null}

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title={tr('重置存档')}>
        <div className='space-y-4'>
          <div className='flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger'>
            <AlertTriangle size={16} className='mt-0.5 shrink-0' />
            <span>
              {tr('这将从本地存储中删除当前俱乐部、全部选手卡、比赛与赛事，并返回初始引导流程。如需保留，请先导出存档。')}
            </span>
          </div>
          <div className='flex justify-end gap-2'>
            <Button variant='ghost' size='sm' onClick={() => setConfirmReset(false)}>
              {tr('取消')}
            </Button>
            <Button
              variant='danger'
              size='sm'
              onClick={async () => {
                setConfirmReset(false);
                await resetGame();
                setStatus({ kind: 'ok', text: tr('存档已重置。创建新俱乐部即可重新开始。') });
              }}
            >
              {tr('删除存档')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
