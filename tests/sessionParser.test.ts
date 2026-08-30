import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractUserFromCookie, decodeGobInteger } from '../src/sessionParser.js';

describe('sessionParser tests', () => {
  it('giải mã đúng gob integer/uint', () => {
    // 0x02 => (2 >> 1) = 1
    const buf1 = Buffer.from([0x02]);
    const res1 = decodeGobInteger(buf1, 0);
    assert.strictEqual(res1.value, 1);
    assert.strictEqual(res1.bytesRead, 1);

    // fd 0e 78 32 => 0x0e 78 32 = 948274 => zigzag >> 1 = 474137
    const buf2 = Buffer.from([0xfd, 0x0e, 0x78, 0x32]);
    const res2 = decodeGobInteger(buf2, 0);
    assert.strictEqual(res2.value, 474137);
    assert.strictEqual(res2.bytesRead, 4);

    // fd 0e 7c 9c => 0x0e 7c 9c = 949404 => zigzag >> 1 = 474702
    const buf3 = Buffer.from([0xfd, 0x0e, 0x7c, 0x9c]);
    const res3 = decodeGobInteger(buf3, 0);
    assert.strictEqual(res3.value, 474702);
    assert.strictEqual(res3.bytesRead, 4);
  });

  it('giải mã đúng User ID và username từ session cookie Gob của New API', () => {
    const sampleCookie = '1787988978|DX8EAQL_gAABEAEQAAD-AUT_gAAGBnN0cmluZwwNAAtvYXV0aF9zdGF0ZQZzdHJpbmcM_4sA_4hleUp1SWpvaWRGSkdiMHREZVRCWlkxZHJJaXdpYlNJNklteHZaMmx1SWl3aWRTSTZNQ3dpWlNJNk1UYzROems0T1RVM05uMC5jOTZmNjQxYjE2NjFkYjVjNWZmNGVmMTYzODcxOWJjYzVlYjIyYmRkMTZhZDk4MzE5OWVmMGIwYTc0MzE2NmY4BnN0cmluZwwEAAJpZANpbnQEBQD9DngyBnN0cmluZwwKAAh1c2VybmFtZQZzdHJpbmcMDwANZ2l0aHViXzQ3NDEzNwZzdHJpbmcMBgAEcm9sZQNpbnQEAgACBnN0cmluZwwIAAZzdGF0dXMDaW50BAIAAgZzdHJpbmcMBwAFZ3JvdXAGc3RyaW5nDAkAB2RlZmF1bHQ=|placeholder';
    const user = extractUserFromCookie(sampleCookie);
    assert.strictEqual(user.username, 'github_474137');
    assert.strictEqual(user.id, 474137);
    assert.strictEqual(user.role, 1);
    assert.strictEqual(user.status, 1);
    assert.strictEqual(user.group, 'default');
  });

  it('giải mã đúng account thứ 2 có thứ tự key khác trong gob', () => {
    const sampleCookie2 = '1787989442|DX8EAQL_gAABEAEQAAD-AUT_gAAGBnN0cmluZwwKAAh1c2VybmFtZQZzdHJpbmcMDwANZ2l0aHViXzQ3NDcwMgZzdHJpbmcMBgAEcm9sZQNpbnQEAgACBnN0cmluZwwIAAZzdGF0dXMDaW50BAIAAgZzdHJpbmcMBwAFZ3JvdXAGc3RyaW5nDAkAB2RlZmF1bHQGc3RyaW5nDA0AC29hdXRoX3N0YXRlBnN0cmluZwz_iwD_iGV5SnVJam9pUjNaNFZFRk9ibTlsT1d4V0lpd2liU0k2SW14dloybHVJaXdpZFNJNk1Dd2laU0k2TVRjNE56azVNREF4TjMwLjIzNDkxZDJiYTQxNmM5ZjgyZTdhMDgxZDIzNmM3NDBiYmZlNWUwZmVlODMyZmJkNjQwYmVjM2FmMGUzMGQyMTYGc3RyaW5nDAQAAmlkA2ludAQFAP0OfJw=|placeholder';
    const user2 = extractUserFromCookie(sampleCookie2);
    assert.strictEqual(user2.username, 'github_474702');
    assert.strictEqual(user2.id, 474702);
    assert.strictEqual(user2.role, 1);
    assert.strictEqual(user2.status, 1);
    assert.strictEqual(user2.group, 'default');
  });
});
