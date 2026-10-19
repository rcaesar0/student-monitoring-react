// Reads files picked by the teacher into data URLs that can be saved with a post.
// Pictures are shrunk to keep browser storage small. Other files must be 700 KB or less.
export const MAX_FILES = 4;
export const MAX_FILE_BYTES = 700 * 1024;
export const ATTACH_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';

function readDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Could not read the file.'));
    r.readAsDataURL(file);
  });
}

async function compressImage(file, max = 1280) {
  const url = await readDataUrl(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => reject(new Error('That picture could not be opened.'));
    img.src = url;
  });
}

export async function readAttachment(file) {
  if (file.type.startsWith('image/')) {
    const data = await compressImage(file);
    return { name: `${file.name.replace(/\.[^.]+$/, '')}.jpg`, type: 'image/jpeg', size: Math.round(data.length * 0.75), data, isImage: true };
  }
  if (file.size > MAX_FILE_BYTES) throw new Error(`"${file.name}" is over 700 KB. Please use a smaller file.`);
  return { name: file.name, type: file.type, size: file.size, data: await readDataUrl(file), isImage: false };
}

export const sizeLabel = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);