import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import SiteHomeButton from '../src/components/AppLayout/SiteHomeButton';

test('panel home button is recognizable and accessible on mobile and desktop', () => {
  const html = renderToString(createElement(SiteHomeButton, { onClick: () => {} }));
  assert.match(html, /صفحه اصلی سایت/);
  assert.match(html, /aria-label="صفحه اصلی سایت"/);
  assert.match(html, /type="button"/);
});

test('panel home button delegates navigation to the guarded layout callback', () => {
  let clicks = 0;
  const tree = SiteHomeButton({ onClick: () => { clicks += 1; } });
  assert.equal(tree.type, 'button');
  tree.props.onClick();
  assert.equal(clicks, 1);
});
