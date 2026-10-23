import React from 'react';
import { createPortal } from 'react-dom';
import { Modal } from './UI';

export const TERMS_VERSION = '1.0';

// Terms and Agreement shown at sign up. It is drawn outside the sign-up form on purpose,
// so its buttons can never submit the form by accident.
// NOTE: this is a plain-language draft. Have the school (and its data protection officer) review it before real use.
export default function TermsModal({ onClose, onAgree }) {
  return createPortal(
    <Modal title="Terms and Agreement" onClose={onClose}>
      <div className="terms">
        <small>Version {TERMS_VERSION} · Please read this before creating your account.</small>

        <h4>1. What this app is for</h4>
        <p>This app helps guardians and teachers stay in touch about a student’s attendance, grades, activities and announcements. It is a monitoring and communication tool. The school’s official records stay with the school, and the school’s own records are the final word if anything differs.</p>

        <h4>2. Who can use it</h4>
        <p>Guardian accounts are for the parent or legal guardian of a student enrolled in this school. Teacher and administrator accounts are created by the school. You must give true and complete information when you sign up and keep it up to date in your profile.</p>

        <h4>3. Your account</h4>
        <p>Keep your password and verification codes private and do not share your account with anyone. You are responsible for what happens under your account. Tell the school office right away if you think someone else has used it.</p>

        <h4>4. Linking your child</h4>
        <p>You can see only the children whose link the school has approved. The school may decline or remove a link if the details do not match its records. Do not try to link a child who is not yours.</p>

        <h4>5. Your child’s information</h4>
        <p>Grades, attendance and other details you see are for you and your family only. Do not post screenshots or share them publicly, including on social media.</p>

        <h4>6. Messages and conduct</h4>
        <p>Be respectful when you message teachers and other users. Harassment, threats, offensive language, spam and false statements are not allowed. The school administrator may review conversations for safety, to settle a complaint or to check that these terms are followed. This includes messages that were edited or deleted. The school may suspend an account that breaks these terms.</p>

        <h4>7. Privacy and your data</h4>
        <p>We collect the details you give at sign up (your name, relationship to the child, mobile number or email, address and emergency contact) and the messages you send in the app. They are used only to run this service for the school: to verify who you are, to link you to your child, to show you your child’s school updates and to let you talk with teachers. The school handles this information under the Data Privacy Act of 2012 (Republic Act No. 10173). Only authorized school staff can access it, and it is not sold or used for advertising. You may ask the school office to see or correct your information, or to close your account, within the school’s retention rules.</p>

        <h4>8. Notifications</h4>
        <p>Notifications outside the app are optional and you can turn them off at any time in Notification settings. If you turn them on, the sender’s name and, if you allow it, the start of the message can show on your screen, including a locked screen.</p>

        <h4>9. Changes and questions</h4>
        <p>The school may update these terms. If it does, you may be asked to accept the new version. For questions about these terms or your information, please contact the school office.</p>
      </div>
      <div className="form-actions">
        <button type="button" onClick={onClose}>Close</button>
        <button type="button" className="primary" onClick={onAgree}>I agree</button>
      </div>
    </Modal>,
    document.body
  );
}