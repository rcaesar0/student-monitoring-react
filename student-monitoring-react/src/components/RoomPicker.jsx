import React from 'react';
import { Modal } from './UI';
import { useApp } from '../context/AppContext';
import { ROOM_THEMES, DEFAULT_THEME, roomStyle } from '../utils/roomThemes';

// The teacher picks the room's wallpaper. Guardians of that room see the same one.
export default function RoomPicker({ room, onClose }) {
  const { db, repo } = useApp();
  const live = db.rooms.find((r) => r.id === room.id) || room;
  const current = live.theme || DEFAULT_THEME;

  return (
    <Modal title={`Color for ${room.name}`} onClose={onClose}>
      <p className="hint">Guardians of this room will see the same color.</p>
      <div className="theme-grid">
        {Object.entries(ROOM_THEMES).map(([key, t]) => (
          <button
            key={key} type="button" aria-pressed={current === key}
            className={`theme-tile ${current === key ? 'on' : ''}`} style={roomStyle(key)}
            onClick={() => repo.update('rooms', room.id, { theme: key })}
          >
            <span>{t.label}{current === key ? ' (selected)' : ''}</span>
          </button>
        ))}
      </div>
      <div className="form-actions">
        <button className="primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}