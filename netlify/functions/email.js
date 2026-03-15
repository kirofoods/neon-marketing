// NEON — IMAP Email Proxy (Netlify Serverless Function)
// Connects to IMAP server and fetches emails

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { action, config, options } = JSON.parse(event.body);
    const { host, port, user, password, tls } = config;

    const client = new ImapFlow({
      host,
      port: port || 993,
      secure: tls !== false,
      auth: { user, pass: password },
      logger: false,
    });

    await client.connect();

    let result;

    switch (action) {
      case 'folders': {
        const folders = [];
        const tree = await client.list();
        for (const folder of tree) {
          folders.push({ name: folder.name, path: folder.path, specialUse: folder.specialUse });
        }
        result = { folders };
        break;
      }

      case 'list': {
        const folder = options?.folder || 'INBOX';
        const limit = options?.limit || 20;
        const page = options?.page || 1;
        const lock = await client.getMailboxLock(folder);
        try {
          const status = await client.status(folder, { messages: true, unseen: true });
          const total = status.messages;
          const start = Math.max(1, total - (page * limit) + 1);
          const end = Math.max(1, total - ((page - 1) * limit));

          const messages = [];
          for await (let msg of client.fetch(`${start}:${end}`, { envelope: true, flags: true, bodyStructure: true, size: true })) {
            messages.push({
              uid: msg.uid,
              seq: msg.seq,
              from: msg.envelope.from?.[0] || {},
              to: msg.envelope.to || [],
              subject: msg.envelope.subject || '(no subject)',
              date: msg.envelope.date,
              flags: [...(msg.flags || [])],
              size: msg.size,
              seen: msg.flags?.has('\\Seen'),
            });
          }
          messages.reverse();
          result = { messages, total, unseen: status.unseen, page, limit };
        } finally {
          lock.release();
        }
        break;
      }

      case 'read': {
        const folder = options?.folder || 'INBOX';
        const uid = options?.uid;
        if (!uid) throw new Error('UID required');
        const lock = await client.getMailboxLock(folder);
        try {
          const msg = await client.fetchOne(uid, { source: true }, { uid: true });
          const parsed = await simpleParser(msg.source);
          // Mark as seen
          await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true });
          result = {
            uid,
            from: parsed.from?.value || [],
            to: parsed.to?.value || [],
            cc: parsed.cc?.value || [],
            subject: parsed.subject || '(no subject)',
            date: parsed.date,
            text: parsed.text || '',
            html: parsed.html || '',
            attachments: (parsed.attachments || []).map(a => ({
              filename: a.filename,
              contentType: a.contentType,
              size: a.size,
            })),
          };
        } finally {
          lock.release();
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    await client.logout();
    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
}
