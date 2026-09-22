import React, { useRef, useState } from 'react';
import {
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileVideo,
} from 'lucide-react';

import { EDGE_URL } from '../../services/edgeApi';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export function VideoUploadPanel({
  camera,
  sourceFile,
  inputMode,
  onSourceChanged,
}) {
  const inputRef = useRef(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const road = camera === 'road';

  const defaultSource = road ? 'road.mp4' : 'traffic.mp4';

  const modeLabel =
    inputMode === 'UPLOADED_TEST_VIDEO'
      ? 'Uploaded test video'
      : 'Default demo video';

  const handleFile = async event => {
    const file = event.target.files?.[0];

    if (!file) return;

    setBusy(true);
    setMessage(null);

    const formData = new FormData();

    formData.append('file', file);
    formData.append('camera', camera);

    try {
      const response = await fetch(`${EDGE_URL}/api/upload-video`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Video upload failed');
      }

      setMessage({
        type: 'ok',
        text: `${file.name} loaded successfully`,
      });

      // Give the restarted worker time to generate its first frame.
      await wait(900);

      onSourceChanged?.();
    } catch (error) {
      setMessage({
        type: 'err',
        text: error.message || 'Video upload failed',
      });
    } finally {
      setBusy(false);

      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleReset = async () => {
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch(
        `${EDGE_URL}/api/reset-video?camera=${camera}`,
        {
          method: 'POST',
        },
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to restore default video');
      }

      setMessage({
        type: 'ok',
        text: `${road ? 'Road' : 'Traffic'} camera restored to default`,
      });

      await wait(900);

      onSourceChanged?.();
    } catch (error) {
      setMessage({
        type: 'err',
        text: error.message || 'Reset failed',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

        {/* Current source information */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">

            <FileVideo className="h-4 w-4 text-blue-600" />

            <p className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
              Test Input
            </p>

          </div>

          <p className="mt-1 truncate text-xs font-semibold text-slate-700">
            {sourceFile || defaultSource}
          </p>

          <p className="mt-0.5 text-[11px] text-slate-500">
            {modeLabel}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">

          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/avi,video/quicktime,video/x-msvideo"
            onChange={handleFile}
            className="hidden"
            disabled={busy}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >

            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}

            Upload Test Video
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >

            <RotateCcw className="h-3.5 w-3.5" />

            Use Default
          </button>

        </div>
      </div>

      {/* Upload/restart progress */}
      {busy && (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-xs font-semibold text-blue-700">

          <Loader2 className="h-3.5 w-3.5 animate-spin" />

          Switching video source and restarting{' '}
          {road ? 'Road' : 'Traffic'} AI…

        </div>
      )}

      {/* Result */}
      {message && !busy && (
        <div
          className={`mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-xs font-semibold ${
            message.type === 'ok'
              ? 'text-emerald-700'
              : 'text-red-700'
          }`}
        >

          {message.type === 'ok' ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" />
          )}

          {message.text}

        </div>
      )}

    </div>
  );
}