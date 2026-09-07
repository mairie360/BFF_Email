import request from 'supertest';
import { readFileSync } from 'node:fs';
import app from '../src/app';

const fetchMock = jest.spyOn(globalThis, 'fetch');
beforeEach(() => { fetchMock.mockReset(); });
afterAll(() => { fetchMock.mockRestore(); });
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

test('runtime and exported routes/data have the same OpenAPI document', async () => {
  const expected = JSON.parse(readFileSync('contracts/openapi.json', 'utf8'));
  for (const path of ['/openapi.json', '/swagger.json']) {
    const result = await request(app).get(path);
    expect(result.status).toBe(200);
    expect(result.body).toEqual(expected);
  }
});

test('bootstrap rejects a missing session before contacting upstream services', async () => {
  const result = await request(app).get('/emails/bootstrap');
  expect(result.status).toBe(401);
  expect(fetchMock).not.toHaveBeenCalled();
});

beforeEach(() => { process.env.EMAIL_API_URL = 'http://email.example'; process.env.CORE_API_URL = 'http://core.example'; });
test('bootstrap reads messages, folders and the current user from upstream services', async () => {
  const message = { id: '42', senderName: 'Alice', senderEmail: 'alice@example.test', recipients: ['bob@example.test'], subject: 'Budget', preview: 'Bonjour', body: 'Bonjour', timestamp: '2026-09-01T12:00:00Z', folder: 'inbox' };
  fetchMock.mockResolvedValueOnce(response({ messages: [message] })).mockResolvedValueOnce(response({ folders: [{ id: 'inbox', label: 'Réception', count: 1 }] })).mockResolvedValueOnce(response({ email: 'bob@example.test' }));
  const result = await request(app).get('/emails/bootstrap').set('Authorization', 'Bearer test-session');
  expect(result.status).toBe(200); expect(result.body.messages).toEqual([message]); expect(result.body.currentUserEmail).toBe('bob@example.test');
});
test('sending preserves data and the owning service status', async () => {
  const body = { to: ['bob@example.test'], subject: 'Budget', body: 'Bonjour', attachmentIds: ['file-42'], mode: 'reply', sourceMessageId: 'original' };
  fetchMock.mockResolvedValueOnce(response({ message: 'Unavailable' }, 503));
  const result = await request(app).post('/emails/messages').set('Authorization', 'Bearer test-session').send(body);
  expect(result.status).toBe(503);
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(body);
  expect(fetchMock.mock.calls[0][1]?.method).toBe('POST');
});
test('invalid recipient data is rejected before sending', async () => {
  const result = await request(app).post('/emails/messages').set('Authorization', 'Bearer test-session').send({ to: ['invalid'], subject: 'Budget', body: 'Bonjour' });
  expect(result.status).toBe(400); expect(fetchMock).not.toHaveBeenCalled();
});
test('message state is forwarded without changing the original folder', async () => {
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
  const body = { folder: 'trash', originalFolder: 'sent' };
  const result = await request(app).patch('/emails/messages/42/state').set('Authorization', 'Bearer test-session').send(body);
  expect(result.status).toBe(204); expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(body);
});
