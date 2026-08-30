import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPersonalSettingsHtml } from '../src/renderPersonalPage.js';

test('renderPersonalSettingsHtml contains correct balance and username', () => {
  const html = renderPersonalSettingsHtml({
    id: 123456,
    username: 'github_test',
    displayName: 'Test User',
    balance: '$250.00',
    consumption: '$0.00',
    requests: 0,
    group: 'default',
  });

  assert.match(html, /github_test/);
  assert.match(html, /\$250\.00/);
  assert.match(html, /Personal Settings/);
});
