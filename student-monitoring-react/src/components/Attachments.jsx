import React, { useState } from 'react';
import Icon from './Icon';
import { Modal } from './UI';
import { MAX_FILES, ATTACH_ACCEPT, readAttachment, sizeLabel } from '../utils/attachments';

// Used inside the post form: pick files or pictures, see them listed, remove them.
export function AttachmentPicker({ files, onChange }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function pick(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = '';
    if (!picked.length) return;
    setError('');
    if (files.length + picked.length > MAX_FILES) return setError(`You can attach up to ${MAX_FILES} files.`);
    setBusy(true);
    try {
      const read = await Promise.all(picked.map(readAttachment));
      onChange([...files, ...read]);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="attach-box">
      <label className="attach-btn">
        <Icon name="attach" size={16} />
        <span>{busy ? 'Adding...' : 'Attach files or pictures'}</span>
        <input type="file" multiple hidden accept={ATTACH_ACCEPT} onChange={pick} disabled={busy} />
      </label>
      {files.map((f, i) => (
        <div className="attach-row" key={`${f.name}-${i}`}>
          {f.isImage ? <img className="attach-thumb" src={f.data} alt="" /> : <Icon name="attach" size={18} />}
          <span className="attach-name">{f.name}</span>
          <small>{sizeLabel(f.size)}</small>
          <button type="button" className="btn-sm" onClick={() => onChange(files.filter((_, j) => j !== i))}>Remove</button>
        </div>
      ))}
      {error && <div className="error">{error}</div>}
    </div>
  );
}

// Shows a post's attachments: pictures as thumbnails (tap to enlarge), other files as download links.
export function AttachmentList({ files }) {
  const [viewing, setViewing] = useState(null);
  if (!files || !files.length) return null;
  const pics = files.filter((f) => f.isImage);
  const docs = files.filter((f) => !f.isImage);

  return (
    <div className="attach-list">
      {pics.length > 0 && (
        <div className="attach-pics">
          {pics.map((f, i) => (
            <button type="button" key={`${f.name}-${i}`} className="attach-pic" onClick={() => setViewing(f)} aria-label={`View ${f.name}`}>
              <img src={f.data} alt={f.name} />
            </button>
          ))}
        </div>
      )}
      {docs.map((f, i) => (
        <a key={`${f.name}-${i}`} className="attach-file" href={f.data} download={f.name}>
          <Icon name="attach" size={16} />
          <span>{f.name}</span>
          <small>{sizeLabel(f.size)}</small>
        </a>
      ))}
      {viewing && (
        <Modal title={viewing.name} onClose={() => setViewing(null)}>
          <img className="lightbox" src={viewing.data} alt={viewing.name} />
          <a className="attach-file" href={viewing.data} download={viewing.name}>Download</a>
        </Modal>
      )}
    </div>
  );
}