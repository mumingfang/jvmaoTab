const PREFIX = 'JVM-WD1';
const FIELDS = ['webDavURL', 'webDavUsername', 'webDavPassword', 'webDavDir'];

const encodeBytes = (bytes) => btoa(String.fromCharCode(...bytes))
  .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');

const decodeBytes = (text) => {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) throw new Error('配置串格式无效');
  const base64 = text.replaceAll('-', '+').replaceAll('_', '/');
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')),
    (character) => character.charCodeAt(0));
};

const validateConfig = (value) => {
  if (!value || typeof value !== 'object' || FIELDS.some((field) =>
    typeof value[field] !== 'string' || !value[field])) {
    throw new Error('配置串缺少 WebDAV 配置');
  }
  return Object.fromEntries(FIELDS.map((field) => [field, value[field]]));
};

export const isWebdavConfigToken = (text) =>
  typeof text === 'string' && text.trim().startsWith(`${PREFIX}.`);

export const createWebdavConfigToken = async (config) => {
  const payload = new TextEncoder().encode(JSON.stringify(validateConfig(config)));
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true,
    ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv },
    key, payload));
  const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  // 无解密口令的跨设备配置串必须自带密钥；它可防止明文展示和误改，不能抵御持串者还原密码。
  return `${PREFIX}.${encodeBytes(rawKey)}.${encodeBytes(iv)}.${encodeBytes(ciphertext)}`;
};

export const parseWebdavConfigToken = async (token) => {
  const parts = String(token ?? '').trim().split('.');
  if (parts.length !== 4 || parts[0] !== PREFIX) throw new Error('配置串格式无效');
  try {
    const keyBytes = decodeBytes(parts[1]);
    const iv = decodeBytes(parts[2]);
    const ciphertext = decodeBytes(parts[3]);
    if (keyBytes.length !== 32 || iv.length !== 12 || ciphertext.length < 17) {
      throw new Error('invalid length');
    }
    const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return validateConfig(JSON.parse(new TextDecoder().decode(plaintext)));
  } catch {
    throw new Error('配置串无效或已损坏');
  }
};
