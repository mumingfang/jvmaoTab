// 暗格按键是界面显示开关，不用于保护数据。
export const DEFAULT_HIDDEN_SHORTCUT = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowLeft', 'ArrowRight', 'ArrowRight', 'b', 'a', 'b', 'a'];
export const MAX_HIDDEN_SHORTCUT_LENGTH = 16;

export const normalizeShortcutKey = (key) => {
  if (typeof key !== 'string') return null;
  if (/^Arrow(Up|Down|Left|Right)$/.test(key)) return key;
  if (/^[a-z0-9]$/i.test(key)) return key.toLowerCase();
  return null;
};

export const normalizeHiddenShortcut = (keys) => {
  if (!Array.isArray(keys) || keys.length < 2 || keys.length > MAX_HIDDEN_SHORTCUT_LENGTH) {
    return [...DEFAULT_HIDDEN_SHORTCUT];
  }
  const normalized = keys.map(normalizeShortcutKey);
  return normalized.every(Boolean) ? normalized : [...DEFAULT_HIDDEN_SHORTCUT];
};

export const shouldIgnoreHiddenShortcutEvent = (event) => {
  if (event.defaultPrevented || event.repeat || event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return true;
  const target = event.target;
  return Boolean(target?.isContentEditable || target?.closest?.('input, textarea, select, [contenteditable], [role="textbox"]'));
};

export const advanceHiddenShortcut = (keys, index, key) => {
  const normalizedKey = normalizeShortcutKey(key);
  if (!normalizedKey || !keys?.length) return { index: 0, matched: false };
  const nextIndex = keys[index] === normalizedKey ? index + 1 : (keys[0] === normalizedKey ? 1 : 0);
  return { index: nextIndex === keys.length ? 0 : nextIndex, matched: nextIndex === keys.length };
};
