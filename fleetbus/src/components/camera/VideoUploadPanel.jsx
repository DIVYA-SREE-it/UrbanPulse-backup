import React, { useRef, useState } from 'react';
import { Upload, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { EDGE_URL } from '../../services/edgeApi';

function UploadRow({ label, camera, onMessage, onReset }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    onMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('camera', camera);

    try {
      const res = await fetch(`${EDGE_URL}/api/upload-video`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        onMessage({ type: 'ok', text: `${label}: loaded ${data.filename} (${data.frames} frames @ ${data.fps || '?'} fps)` });
      } else {
        onMessage({ type: 'err', text: `${label}: ${data.error || 'upload failed'}` });
      }
    } catch (err) {
      onMessage({ type: 'err', text: `${label}: ${err.message}` });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleReset = async () => {
    try {
      await fetch(`${EDGE_URL}/api/reset-video?camera=${camera}`, { method: 'POST' });
      onReset();
      onMessage({ type: 'ok', text: `${label}: reverted to default` });
    } catch (err) {
      onMessage({ type: 'err', text: `${label}: reset failed — ${err.message}` });
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap border-l-4 border-l-blue-500 pl-3 py-2">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 w-24">
        {label}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/avi,video/quicktime,video/x-msvideo"
        onChange={handleFile}
        className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
        disabled={uploading}
      />
      <button
        onClick={handleReset}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
      >
        <RotateCcw className="w-3 h-3" />
        Reset
      </button>
      {uploading && <span className="text-xs text-blue-600 font-bold">Uploading…</span>}
    </div>
  );
}

export function VideoUploadPanel() {
  const [message, setMessage] = useState(null);

  return (
    <div className="bg-white rounded-card border border-slate-200 p-4 shadow-subtle space-y-3">
      <div className="flex items-center gap-2">
        <Upload className="w-4 h-4 text-blue-600" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Feed Camera Sources
        </span>
      </div>

      <UploadRow
        label="Road"
        camera="road"
        onMessage={setMessage}
        onReset={() => { }}
      />
      <UploadRow
        label="Traffic"
        camera="traffic"
        onMessage={setMessage}
        onReset={() => { }}
      />

      {message && (
        <div
          className={`text-xs font-bold flex items-center gap-1.5 pt-2 border-t border-slate-100 ${message.type === 'ok' ? 'text-emerald-700' : 'text-red-700'
            }`}
        >
          {message.type === 'ok' ? (
            <CheckCircle2 className="w-3.5 h-3.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5" />
          )}
          {message.text}
        </div>
      )}
    </div>
  );
}