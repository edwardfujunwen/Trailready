import { useState, useRef, useCallback } from 'react';
import { parseGpx } from '../../utils/gpx';
import { useTrailStore } from '../../store/useTrailStore';

export default function GpxUploader() {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadedTrail = useTrailStore((s) => s.loadedTrail);
  const setLoadedTrail = useTrailStore((s) => s.setLoadedTrail);
  const clearTrail = useTrailStore((s) => s.clearTrail);

  const processFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith('.gpx')) {
        setError('Please upload a .gpx file');
        return;
      }
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const result = parseGpx(text);
          setLoadedTrail({
            name: result.name,
            geojson: result.geojson,
            source: 'gpx',
            distanceMi: result.distanceMi,
          });
        } catch (err: any) {
          setError(err.message || 'Failed to parse GPX file');
        }
      };
      reader.onerror = () => setError('Failed to read file');
      reader.readAsText(file);
    },
    [setLoadedTrail]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      // Reset so same file can be re-uploaded
      e.target.value = '';
    },
    [processFile]
  );

  // If a GPX trail is loaded, show summary
  if (loadedTrail?.source === 'gpx') {
    return (
      <div className="p-3">
        <div className="bg-stone-800 border border-blue-500/40 rounded-lg px-3 py-2.5 flex items-start gap-2">
          <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-4.724A1 1 0 013 14.382V5a1 1 0 011-1h16a1 1 0 011 1v9.382a1 1 0 01-.553.894L15 20m-6 0v-4a1 1 0 011-1h4a1 1 0 011 1v4m-6 0h6" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-100 truncate">{loadedTrail.name}</p>
            {loadedTrail.distanceMi !== undefined && (
              <p className="text-xs text-stone-400">{loadedTrail.distanceMi.toFixed(1)} mi</p>
            )}
          </div>
          <button
            onClick={() => clearTrail()}
            className="text-stone-500 hover:text-stone-300 flex-shrink-0 transition-colors"
            title="Remove trail"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-2 px-4 py-5
          border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${dragging
            ? 'border-blue-400 bg-blue-500/10'
            : 'border-stone-600 bg-stone-800 hover:border-stone-500 hover:bg-stone-700/50'
          }
        `}
      >
        <svg className={`w-7 h-7 ${dragging ? 'text-blue-400' : 'text-stone-500'} transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <div className="text-center">
          <p className={`text-sm font-medium ${dragging ? 'text-blue-300' : 'text-stone-300'} transition-colors`}>
            {dragging ? 'Drop GPX file here' : 'Upload GPX File'}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            AllTrails, CalTopo, Garmin & more
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
