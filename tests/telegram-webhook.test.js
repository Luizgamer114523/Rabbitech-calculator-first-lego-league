import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/telegram-webhook.js';

function response() {
  return {
    statusCode: 200,
    headers: {},
    payload: null,
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}

test('rejects GET requests', async () => {
  const res = response();
  await handler({ method: 'GET', headers: {}, body: {} }, res);
  assert.equal(res.statusCode, 405);
});

test('rejects webhook requests without secret', async () => {
  const oldSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  const res = response();
  await handler({ method: 'POST', headers: {}, body: {} }, res);
  assert.equal(res.statusCode, 401);
  if (oldSecret === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
  else process.env.TELEGRAM_WEBHOOK_SECRET = oldSecret;
});

test('rejects incorrect webhook secret', async () => {
  const oldSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  process.env.TELEGRAM_WEBHOOK_SECRET = 'expected-secret';
  const res = response();
  await handler({ method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'wrong-secret' }, body: {} }, res);
  assert.equal(res.statusCode, 401);
  if (oldSecret === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET;
  else process.env.TELEGRAM_WEBHOOK_SECRET = oldSecret;
});
