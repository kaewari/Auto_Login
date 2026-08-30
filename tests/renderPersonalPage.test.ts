import { describe, it } from 'node:test';
import assert from 'node:assert';
import { renderPersonalSettingsHtml } from '../src/renderPersonalPage.js';

describe('renderPersonalPage tests', () => {
  it('render đúng thông tin username, id và balance cho account', () => {
    const html = renderPersonalSettingsHtml({
      id: 474137,
      username: 'github_474137',
      displayName: 'kaewari',
      balance: '$259.81',
      consumption: '$0.19',
      requests: 14,
      group: 'default',
    });

    assert.match(html, /github_474137/);
    assert.match(html, /ID: 474137/);
    assert.match(html, /\$259\.81/);
    assert.match(html, /\$0\.19/);
    assert.match(html, />14</);
    assert.match(html, /Personal Settings/);
  });
});
