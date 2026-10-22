import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_HIDDEN_SHORTCUT,
  advanceHiddenShortcut,
  normalizeHiddenShortcut,
  shouldIgnoreHiddenShortcutEvent,
} from './hiddenShortcut.js';

test('旧的暗格按键保留，损坏的配置恢复默认', () => {
  assert.deepEqual(normalizeHiddenShortcut(DEFAULT_HIDDEN_SHORTCUT), DEFAULT_HIDDEN_SHORTCUT);
  assert.deepEqual(normalizeHiddenShortcut(['a', 'B', 'ArrowUp']), ['a', 'b', 'ArrowUp']);
  assert.deepEqual(normalizeHiddenShortcut(['a']), DEFAULT_HIDDEN_SHORTCUT);
  assert.deepEqual(normalizeHiddenShortcut(['a', 'Escape']), DEFAULT_HIDDEN_SHORTCUT);
});

test('错误按键可作为下一轮的第一个按键，成功后清零', () => {
  const shortcut = ['a', 'b'];
  assert.deepEqual(advanceHiddenShortcut(shortcut, 1, 'a'), { index: 1, matched: false });
  assert.deepEqual(advanceHiddenShortcut(shortcut, 1, 'b'), { index: 0, matched: true });
});

test('输入区、修饰键和输入法事件不会触发暗格', () => {
  const input = { closest: (selector) => selector.includes('input') ? {} : null };
  assert.equal(shouldIgnoreHiddenShortcutEvent({ target: input }), true);
  assert.equal(shouldIgnoreHiddenShortcutEvent({ target: {}, isComposing: true }), true);
  assert.equal(shouldIgnoreHiddenShortcutEvent({ target: {}, ctrlKey: true }), true);
  assert.equal(shouldIgnoreHiddenShortcutEvent({ target: {} }), false);
});
