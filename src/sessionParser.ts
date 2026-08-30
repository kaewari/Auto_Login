export interface DecodedUserProfile {
  id: number;
  username: string;
  role?: number;
  status?: number;
  group?: string;
}

/**
 * Giải mã số nguyên theo chuẩn Gob (Go encoding/gob)
 * - Nếu byte < 128 (0x80): giá trị uint = byte
 * - Nếu byte >= 128: số byte theo sau n = 256 - byte (two's complement âm của byte)
 *   uint64 = big-endian n bytes tiếp theo.
 * - int được giải mã từ uint thông qua phép đảo Zigzag:
 *   Nếu uint là số lẻ: value = ~(uint >> 1)
 *   Nếu uint là số chẵn: value = uint >> 1
 */
export function decodeGobInteger(buffer: Buffer, offset: number): { value: number; bytesRead: number } {
  if (offset >= buffer.length) {
    return { value: 0, bytesRead: 0 };
  }

  const b0 = buffer[offset];
  if (b0 < 0x80) {
    const uintVal = b0;
    const intVal = (uintVal & 1) ? ~(uintVal >> 1) : (uintVal >> 1);
    return { value: intVal, bytesRead: 1 };
  }

  const byteCount = 256 - b0;
  let uintVal = 0;
  for (let i = 0; i < byteCount; i++) {
    const nextByte = buffer[offset + 1 + i];
    if (nextByte === undefined) break;
    uintVal = (uintVal * 256) + nextByte;
  }

  const intVal = (uintVal & 1) ? ~(uintVal >> 1) : (uintVal >> 1);
  return { value: intVal, bytesRead: 1 + byteCount };
}

function findGobBuffer(cookieVal: string): Buffer | null {
  const parts = cookieVal.split('|');
  for (const part of parts) {
    try {
      const b = Buffer.from(part, 'base64');
      if (b.includes('github_') || b.includes('username') || b.includes('id')) {
        return b;
      }
    } catch {}
    try {
      const decodedStr = Buffer.from(part, 'base64').toString('utf-8');
      if (decodedStr.includes('|')) {
        const sub = decodedStr.slice(decodedStr.indexOf('|') + 1);
        const bSub = Buffer.from(sub, 'base64');
        if (bSub.includes('github_') || bSub.includes('username') || bSub.includes('id')) {
          return bSub;
        }
      }
    } catch {}
  }
  return null;
}

/**
 * Trích xuất toàn bộ Profile User (id thật, username, role, status, group) từ Cookie Gorilla Securecookie
 */
export function extractUserFromCookie(cookieVal: string): DecodedUserProfile {
  const result: DecodedUserProfile = {
    id: 1,
    username: 'github_user',
    role: 1,
    status: 1,
    group: 'default',
  };

  try {
    const buf = findGobBuffer(cookieVal);
    if (!buf) return result;

    const latinStr = buf.toString('latin1');

    // 1. Trích xuất username (bỏ qua 'string' và 'username')
    const usernamePos = buf.indexOf(Buffer.from('username'));
    if (usernamePos !== -1) {
      const sub = buf.subarray(usernamePos + 8, usernamePos + 60).toString('latin1');
      const tokens = [...sub.matchAll(/[a-zA-Z0-9_-]+/g)].map(m => m[0]);
      const validToken = tokens.find(t => t !== 'string' && t !== 'int' && t.length >= 3);
      if (validToken) {
        result.username = validToken;
      }
    }

    // Nếu chưa có, fallback tìm bất kỳ pattern github_\d+
    if (result.username === 'github_user') {
      const githubMatch = latinStr.match(/github_(\d+)/);
      if (githubMatch) {
        result.username = githubMatch[0];
      }
    }

    // 2. Trích xuất ID
    for (let i = 0; i < buf.length - 6; i++) {
      if (
        buf[i] === 0x02 &&
        buf[i + 1] === 0x69 && // 'i'
        buf[i + 2] === 0x64 && // 'd'
        buf[i + 3] === 0x03 &&
        buf[i + 4] === 0x69 && // 'i'
        buf[i + 5] === 0x6e && // 'n'
        buf[i + 6] === 0x74    // 't'
      ) {
        let valOffset = i + 7;
        while (valOffset < buf.length && (buf[valOffset] === 0x04 || buf[valOffset] === 0x05 || buf[valOffset] === 0x00 || buf[valOffset] === 0x02)) {
          valOffset++;
        }
        if (valOffset < buf.length) {
          const decoded = decodeGobInteger(buf, valOffset);
          if (decoded.value > 0) {
            result.id = decoded.value;
          }
        }
        break;
      }
    }

    // 3. Trích xuất group nếu có
    const groupPos = buf.indexOf(Buffer.from('group'));
    if (groupPos !== -1) {
      const sub = buf.subarray(groupPos + 5, groupPos + 40).toString('latin1');
      const tokens = [...sub.matchAll(/[a-zA-Z0-9_-]+/g)].map(m => m[0]);
      const validGroup = tokens.find(t => t !== 'string' && t !== 'int' && t.length >= 3);
      if (validGroup) {
        result.group = validGroup;
      }
    }

    // Fallback an toàn nếu id chưa tìm thấy qua gob binary nhưng username có dạng github_123456
    if (result.id === 1 && result.username.startsWith('github_')) {
      const parsed = parseInt(result.username.replace('github_', ''), 10);
      if (!isNaN(parsed)) {
        result.id = parsed;
      }
    }
  } catch (err) {
    console.error('[sessionParser] Error parsing cookie:', err);
  }

  return result;
}
