import React, { useRef, useState } from 'react';
import { Panel, Avatar } from './UI';
import PhotoEditor from './PhotoEditor';
import PhoneField from './PhoneField';
import Icon from './Icon';
import { initials } from '../utils/helpers';
import { toPhone, phoneToInput } from '../utils/phone';
import { useApp } from '../context/AppContext';
import { roleCollection, emailTaken, phoneTaken } from '../services/auth';

const RELATIONS = ['Mother', 'Father', 'Grandmother', 'Grandfather', 'Aunt', 'Uncle', 'Sibling', 'Legal guardian', 'Other'];
const PHONE_ERROR = 'Please enter a valid mobile number.';

// Shared by all roles. Changing the password is in the account menu (top right).
export default function ProfilePanel() {
  const { db, user, repo } = useApp();
  const col = roleCollection(user.role);
  const guardian = user.role === 'Guardian';
  const teacher = user.role === 'Teacher';
  const hasAddress = guardian || teacher;

  const [f, setF] = useState(() => ({
    firstName: user.firstName || '', middleName: user.middleName || '', lastName: user.lastName || '',
    relationship: user.relationship || '', relationshipOther: user.relationshipOther || '', occupation: user.occupation || '',
    phone: phoneToInput(user.phone), email: user.email || '', personalEmail: user.personalEmail || '',
    street: user.street || '', barangay: user.barangay || '', city: user.city || '', province: user.province || '',
    emName: user.emName || '', emPhone: phoneToInput(user.emPhone),
  }));
  const [msg, setMsg] = useState(null);
  const [bad, setBad] = useState(''); // which mobile box to outline: 'phone' | 'emPhone'
  const [picked, setPicked] = useState(null);
  const [photoMsg, setPhotoMsg] = useState(null);
  const fileRef = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function choosePhoto(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setPhotoMsg({ type: 'error', text: 'Please choose an image file.' });
    if (file.size > 10 * 1024 * 1024) return setPhotoMsg({ type: 'error', text: 'That picture is too large. Choose one under 10 MB.' });
    setPhotoMsg(null);
    setPicked(file);
  }

  function savePhoto(photo) {
    repo.update(col, user.id, { photo });
    setPicked(null);
    setPhotoMsg({ type: 'info', text: 'Profile picture saved.' });
  }

  function removePhoto() {
    repo.update(col, user.id, { photo: '' });
    setPhotoMsg({ type: 'info', text: 'Profile picture removed.' });
  }

  function save() {
    const fail = (text, field = '') => { setBad(field); setMsg({ type: 'error', text }); };
    setBad('');
    if (!f.firstName.trim() || !f.lastName.trim()) return fail('First and last name are required.');

    const phone = toPhone(f.phone);
    if (f.phone.trim() && !phone) return fail(PHONE_ERROR, 'phone');
    if (phone && phoneTaken(db, phone, user.id)) return fail('That mobile number is already used by another account.', 'phone');

    const patch = { firstName: f.firstName.trim(), middleName: f.middleName.trim(), lastName: f.lastName.trim(), phone };

    if (guardian) {
      const email = f.email.trim();
      if (email && !/^\S+@\S+\.\S+$/.test(email)) return fail('Please enter a valid email address, or leave it empty.');
      if (email && emailTaken(db, email, user.id)) return fail('That email is already used by another account.');
      if (!phone && !email) return fail('Keep at least a mobile number or an email so you can sign in.');
      if (f.relationship === 'Other' && !f.relationshipOther.trim()) return fail('Please specify how you are related to the child.');
      if (f.emPhone.trim() && !toPhone(f.emPhone)) return fail(PHONE_ERROR, 'emPhone');
      Object.assign(patch, {
        email, relationship: f.relationship, relationshipOther: f.relationship === 'Other' ? f.relationshipOther.trim() : '', occupation: f.occupation.trim(),
        emName: f.emName.trim(), emPhone: toPhone(f.emPhone),
      });
    }
    if (teacher) {
      const pe = f.personalEmail.trim();
      if (pe && !/^\S+@\S+\.\S+$/.test(pe)) return fail('Please enter a valid personal email, or leave it empty.');
      patch.personalEmail = pe;
    }
    if (hasAddress) {
      Object.assign(patch, { street: f.street.trim(), barangay: f.barangay.trim(), city: f.city.trim(), province: f.province.trim() });
    }

    repo.update(col, user.id, patch);
    setMsg({ type: 'info', text: 'Profile saved.' });
  }

  return (
    <>
      <Panel title="Profile picture">
        <div className="photo-section">
          <Avatar letter={initials(user)} src={user.photo} size={96} />
          <div>
            <p className="hint">Choose a picture, then crop it before saving.</p>
            <div className="row-actions">
              <button className="primary btn-sm" onClick={() => fileRef.current.click()}>
                <Icon name="camera" size={16} /> {user.photo ? 'Change picture' : 'Upload picture'}
              </button>
              {user.photo && <button className="danger-outline btn-sm" onClick={removePhoto}>Remove</button>}
            </div>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={choosePhoto} />
        {photoMsg && <div className={photoMsg.type}>{photoMsg.text}</div>}
      </Panel>
      {picked && <PhotoEditor file={picked} onCancel={() => setPicked(null)} onSave={savePhoto} />}

      <Panel title="Personal information">
        <div className="grid2">
          <label>First name<input value={f.firstName} onChange={set('firstName')} /></label>
          <label>Last name<input value={f.lastName} onChange={set('lastName')} /></label>
          <label>Middle name<input value={f.middleName} onChange={set('middleName')} /></label>
          {guardian && (
            <label>
              Relationship to the child
              <select value={f.relationship} onChange={set('relationship')}>
                <option value="">Choose one</option>
                {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          )}
          {guardian && <label>Occupation<input value={f.occupation} onChange={set('occupation')} /></label>}
          {teacher && <label>Employee ID<input value={user.employeeId || ''} disabled /></label>}
          {teacher && <label>Subject<input value={user.subject || ''} disabled /></label>}
        </div>
        {guardian && f.relationship === 'Other' && (
          <label>Please specify<input value={f.relationshipOther} onChange={set('relationshipOther')} placeholder="Please specify" /></label>
        )}
      </Panel>

      <Panel title="Contact">
        <div className="grid2">
          <PhoneField value={f.phone} onChange={(phone) => setF({ ...f, phone })} optional={guardian} invalid={bad === 'phone'} />
          {guardian ? (
            <label>Email (optional)<input type="email" value={f.email} onChange={set('email')} placeholder="Email (optional)" /></label>
          ) : (
            <label>School email<input value={user.email} disabled /></label>
          )}
          {teacher && <label>Personal email (optional)<input type="email" value={f.personalEmail} onChange={set('personalEmail')} /></label>}
        </div>
        {guardian && <p className="hint">You can sign in with your mobile number or your email. Keep at least one.</p>}
      </Panel>

      {hasAddress && (
        <Panel title="Home address">
          <label>House no., street<input value={f.street} onChange={set('street')} /></label>
          <div className="grid2">
            <label>Barangay<input value={f.barangay} onChange={set('barangay')} /></label>
            <label>City or municipality<input value={f.city} onChange={set('city')} /></label>
          </div>
          <label>Province<input value={f.province} onChange={set('province')} /></label>
        </Panel>
      )}

      {guardian && (
        <Panel title="Emergency contact">
          <div className="grid2">
            <label>Name<input value={f.emName} onChange={set('emName')} /></label>
            <PhoneField label="Mobile number" value={f.emPhone} onChange={(emPhone) => setF({ ...f, emPhone })} optional invalid={bad === 'emPhone'} />
          </div>
        </Panel>
      )}

      {msg && <div className={msg.type}>{msg.text}</div>}
      <button className="primary wide" onClick={save}>Save changes</button>
    </>
  );
}