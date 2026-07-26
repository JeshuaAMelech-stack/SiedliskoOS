import { useEffect, useState } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';

type State = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'none' | 'error';

export default function UpdateChecker() {
  const [state, setState] = useState<State>('idle');
  const [update, setUpdate] = useState<Update | null>(null);
  const [version, setVersion] = useState('');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    getVersion().then(setVersion).catch(() => undefined);
    const timer = window.setTimeout(() => void lookForUpdate(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  async function lookForUpdate(manual: boolean) {
    if (state === 'checking' || state === 'downloading') return;
    setState('checking');
    if (manual) setShow(true);
    setMessage('Sprawdzam dostępne aktualizacje…');
    try {
      const found = await check({ timeout: 20_000 });
      if (!found) {
        setUpdate(null);
        setState('none');
        setMessage('Masz najnowszą wersję SiedliskoOS.');
        if (!manual) setShow(false);
        return;
      }
      setUpdate(found);
      setState('available');
      setShow(true);
      setMessage(`Dostępna jest wersja ${found.version}. Zainstalować teraz?`);
    } catch (error) {
      setState('error');
      setMessage(`Nie udało się sprawdzić aktualizacji: ${String(error)}`);
      if (!manual) setShow(false);
    }
  }

  async function install() {
    if (!update) return;
    setState('downloading');
    setProgress(0);
    setMessage('Pobieram aktualizację…');
    let downloaded = 0;
    let total = 0;
    try {
      await update.downloadAndInstall(event => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? 0;
        } else if (event.event === 'Progress') {
          downloaded += event.data.chunkLength;
          if (total > 0) setProgress(Math.min(100, Math.round((downloaded / total) * 100)));
        } else if (event.event === 'Finished') {
          setProgress(100);
        }
      });
      setState('ready');
      setMessage('Aktualizacja została zainstalowana. Uruchamiam ponownie…');
      await relaunch();
    } catch (error) {
      setState('error');
      setMessage(`Instalacja nie powiodła się: ${String(error)}`);
    }
  }

  return <>
    <button className="updateButton" onClick={() => void lookForUpdate(true)} disabled={state === 'checking' || state === 'downloading'}>
      {state === 'checking' ? 'Sprawdzanie…' : `Aktualizacje${version ? ` · v${version}` : ''}`}
    </button>
    {show && <div className="updateOverlay" onMouseDown={() => state !== 'downloading' && setShow(false)}>
      <div className="updateModal" onMouseDown={event => event.stopPropagation()}>
        <div className="updateIcon">↻</div>
        <h2>Aktualizacja SiedliskoOS</h2>
        <p>{message}</p>
        {update?.body && state === 'available' && <div className="releaseNotes">{update.body}</div>}
        {state === 'downloading' && <div className="progressTrack"><div style={{ width: `${progress}%` }} /></div>}
        <div className="actions">
          {state === 'available' && <>
            <button onClick={() => setShow(false)}>Później</button>
            <button className="primary" onClick={() => void install()}>Aktualizuj teraz</button>
          </>}
          {(state === 'none' || state === 'error') && <button className="primary" onClick={() => setShow(false)}>OK</button>}
        </div>
      </div>
    </div>}
  </>;
}
