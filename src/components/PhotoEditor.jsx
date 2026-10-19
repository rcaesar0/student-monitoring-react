import React, { useEffect, useRef, useState } from 'react';
import { Modal } from './UI';
import { FILTERS, cssFilter, applyFilter } from '../utils/photoFilters';

const BOX = 280;      // crop area on screen (px)
const OUT = 256;      // saved picture size (px). Small on purpose, so it is cheap to store.
const MAX_ZOOM = 3;

const clampPos = (v, size) => Math.min(0, Math.max(BOX - size, v));

// Crop (drag + zoom) and filter a chosen photo before it is saved.
export default function PhotoEditor({ file, onCancel, onSave }) {
  const [img, setImg] = useState(null);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [filterKey, setFilterKey] = useState('none');
  const drag = useRef(null);

  // Load the chosen file.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const base = Math.max(BOX / im.naturalWidth, BOX / im.naturalHeight);
      setPos({ x: (BOX - im.naturalWidth * base) / 2, y: (BOX - im.naturalHeight * base) / 2 });
      setImg({ el: im, url, base });
    };
    im.onerror = () => setError('This file could not be opened as a picture.');
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const scale = img ? img.base * zoom : 1;
  const dw = img ? img.el.naturalWidth * scale : 0;
  const dh = img ? img.el.naturalHeight * scale : 0;
  const filter = FILTERS.find((f) => f.key === filterKey);

  function changeZoom(next) {
    const z = Math.min(MAX_ZOOM, Math.max(1, next));
    const newScale = img.base * z;
    // Keep whatever is in the middle of the box in the middle while zooming.
    const cx = (BOX / 2 - pos.x) / scale;
    const cy = (BOX / 2 - pos.y) / scale;
    setZoom(z);
    setPos({
      x: clampPos(BOX / 2 - cx * newScale, img.el.naturalWidth * newScale),
      y: clampPos(BOX / 2 - cy * newScale, img.el.naturalHeight * newScale),
    });
  }

  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
  };
  const move = (e) => {
    if (!drag.current) return;
    setPos({
      x: clampPos(drag.current.ox + e.clientX - drag.current.sx, dw),
      y: clampPos(drag.current.oy + e.clientY - drag.current.sy, dh),
    });
  };
  const up = () => { drag.current = null; };

  function save() {
    const canvas = document.createElement('canvas');
    canvas.width = OUT; canvas.height = OUT;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img.el, -pos.x / scale, -pos.y / scale, BOX / scale, BOX / scale, 0, 0, OUT, OUT);
    if (filterKey !== 'none') {
      const data = ctx.getImageData(0, 0, OUT, OUT);
      applyFilter(data.data, filter.p);
      ctx.putImageData(data, 0, 0);
    }
    onSave(canvas.toDataURL('image/jpeg', 0.88));
  }

  return (
    <Modal title="Profile photo" onClose={onCancel}>
      {error ? (
        <>
          <div className="error">{error}</div>
          <div className="form-actions"><button onClick={onCancel}>Close</button></div>
        </>
      ) : !img ? (
        <p className="muted">Opening photo…</p>
      ) : (
        <>
          <p className="hint center">Drag to move. Use the slider to zoom.</p>
          <div className="cropper" style={{ width: BOX, height: BOX }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <img
              src={img.url} alt="" draggable={false}
              style={{ left: pos.x, top: pos.y, width: dw, height: dh, filter: cssFilter(filter.p) }}
            />
            <div className="crop-mask" />
          </div>

          <div className="zoom-row">
            <button type="button" className="icon-btn" onClick={() => changeZoom(zoom - 0.25)} aria-label="Zoom out">−</button>
            <input type="range" min="1" max={MAX_ZOOM} step="0.01" value={zoom} onChange={(e) => changeZoom(Number(e.target.value))} aria-label="Zoom" />
            <button type="button" className="icon-btn" onClick={() => changeZoom(zoom + 0.25)} aria-label="Zoom in">+</button>
          </div>

          <h4 className="mini-h">Filter</h4>
          <div className="filter-row">
            {FILTERS.map((f) => (
              <button type="button" key={f.key} className={`filter-chip ${f.key === filterKey ? 'active' : ''}`} onClick={() => setFilterKey(f.key)}>
                <span className="filter-thumb" style={{ backgroundImage: `url(${img.url})`, filter: cssFilter(f.p) }} />
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel}>Cancel</button>
            <button type="button" className="primary" onClick={save}>Use this photo</button>
          </div>
        </>
      )}
    </Modal>
  );
}
