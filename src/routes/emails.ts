import { Router } from 'express';
import { z } from 'zod';
import { registry } from '../openapi-registry';
import { authorization, forward, json, routeError } from '../clients/upstream';

const router = Router();
router.use((req, res, next) => {
  try { authorization(req); next(); } catch (error) { routeError(res, error); }
});
const id = (value: unknown) => encodeURIComponent(String(value));

const FolderId = z.enum(['inbox', 'favorites', 'important', 'sent', 'drafts', 'archived', 'trash']);
export const AttachmentSchema = registry.register('EmailAttachment', z.object({
  id: z.string(), name: z.string(), sizeBytes: z.number().nonnegative(), sizeLabel: z.string(), mimeType: z.string().optional(),
}));
export const MessageSchema = registry.register('EmailMessage', z.object({
  id: z.string(), senderName: z.string(), senderEmail: z.string(), recipients: z.array(z.string()), cc: z.array(z.string()).optional(),
  subject: z.string(), preview: z.string(), body: z.string(), timestamp: z.string(),
  folder: z.enum(['inbox', 'sent', 'drafts', 'archived', 'trash']), unread: z.boolean().optional(),
  isFavorite: z.boolean().optional(), isImportant: z.boolean().optional(), attachments: z.array(AttachmentSchema).optional(),
  originalFolder: z.enum(['inbox', 'sent', 'drafts', 'archived', 'trash']).optional(),
}));
export const ComposeSchema = registry.register('EmailCompose', z.object({
  to: z.array(z.string().email()), subject: z.string(), body: z.string(), attachmentIds: z.array(z.string()).default([]),
  mode: z.enum(['new', 'reply', 'reply-all', 'forward', 'draft']).optional(), sourceMessageId: z.string().optional(),
}));
export const EmailBootstrapSchema = registry.register('EmailBootstrap', z.object({
  messages: z.array(MessageSchema), folders: z.array(z.object({ id: FolderId, label: z.string(), count: z.number().optional() })),
  currentUserEmail: z.string().email(),
}));
registry.registerPath({ method: 'get', path: '/emails/bootstrap', responses: {
  200: { description: 'Boîte de messagerie de l’utilisateur connecté', content: { 'application/json': { schema: EmailBootstrapSchema } } },
  401: { description: 'Session invalide' }, 502: { description: 'Données indisponibles ou incompatibles' },
} });
router.get('/bootstrap', async (req, res) => {
  try {
    const [listing, folders, user] = await Promise.all([
      json<{ messages: unknown[] }>(req, 'EMAIL_API', '/api/v1/emails/messages/'),
      json<{ folders: unknown[] }>(req, 'EMAIL_API', '/api/v1/emails/folders/'),
      json<{ email: string }>(req, 'CORE_API', '/api/v1/user/me/'),
    ]);
    return res.json(EmailBootstrapSchema.parse({ messages: listing.messages, folders: folders.folders, currentUserEmail: user.email }));
  } catch (error) { return routeError(res, error); }
});

registry.registerPath({ method: 'get', path: '/emails/messages', responses: { 200: { description: 'Réponse de l’API propriétaire' }, 201: { description: 'Création confirmée' }, 204: { description: 'Opération confirmée' }, 401: { description: 'Session invalide' }, 502: { description: 'Service indisponible' } } });
router.get('/messages', (req, res) => forward(req, res, 'EMAIL_API', `/api/v1/emails/messages/` + (req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '')));

registry.registerPath({ method: 'get', path: '/emails/messages/{messageId}', request: { params: z.object({ messageId: z.string() }) }, responses: { 200: { description: 'Réponse de l’API propriétaire' }, 201: { description: 'Création confirmée' }, 204: { description: 'Opération confirmée' }, 401: { description: 'Session invalide' }, 502: { description: 'Service indisponible' } } });
router.get('/messages/:messageId', (req, res) => forward(req, res, 'EMAIL_API', `/api/v1/emails/messages/${id(req.params.messageId)}/` + (req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '')));

registry.registerPath({ method: 'post', path: '/emails/messages', request: { body: { required: true, content: { 'application/json': { schema: ComposeSchema } } } }, responses: { 200: { description: 'Réponse de l’API propriétaire' }, 201: { description: 'Création confirmée' }, 204: { description: 'Opération confirmée' }, 401: { description: 'Session invalide' }, 502: { description: 'Service indisponible' } } });
router.post('/messages', (req, res) => {
  const parsed = ComposeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { message: 'Message invalide.', details: parsed.error.issues } });
  req.body = parsed.data;
  return forward(req, res, 'EMAIL_API', `/api/v1/emails/messages/`);
});

registry.registerPath({ method: 'post', path: '/emails/drafts', request: { body: { required: true, content: { 'application/json': { schema: ComposeSchema } } } }, responses: { 200: { description: 'Réponse de l’API propriétaire' }, 201: { description: 'Création confirmée' }, 204: { description: 'Opération confirmée' }, 401: { description: 'Session invalide' }, 502: { description: 'Service indisponible' } } });
router.post('/drafts', (req, res) => {
  const parsed = ComposeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { message: 'Message invalide.', details: parsed.error.issues } });
  req.body = parsed.data;
  return forward(req, res, 'EMAIL_API', `/api/v1/emails/drafts/`);
});

registry.registerPath({ method: 'patch', path: '/emails/drafts/{messageId}', request: { params: z.object({ messageId: z.string() }), body: { required: true, content: { 'application/json': { schema: ComposeSchema } } } }, responses: { 200: { description: 'Réponse de l’API propriétaire' }, 201: { description: 'Création confirmée' }, 204: { description: 'Opération confirmée' }, 401: { description: 'Session invalide' }, 502: { description: 'Service indisponible' } } });
router.patch('/drafts/:messageId', (req, res) => {
  const parsed = ComposeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: { message: 'Message invalide.', details: parsed.error.issues } });
  req.body = parsed.data;
  return forward(req, res, 'EMAIL_API', `/api/v1/emails/drafts/${id(req.params.messageId)}/`);
});

registry.registerPath({ method: 'post', path: '/emails/attachments', request: { body: { required: true, content: { 'multipart/form-data': { schema: z.object({ file: z.string().openapi({ format: 'binary' }), category: z.string().optional() }) } } } }, responses: { 200: { description: 'Réponse de l’API propriétaire' }, 201: { description: 'Création confirmée' }, 204: { description: 'Opération confirmée' }, 401: { description: 'Session invalide' }, 502: { description: 'Service indisponible' } } });
router.post('/attachments', (req, res) => forward(req, res, 'EMAIL_API', `/api/v1/emails/attachments/`));

registry.registerPath({ method: 'get', path: '/emails/attachments/{attachmentId}', request: { params: z.object({ attachmentId: z.string() }) }, responses: { 200: { description: 'Réponse de l’API propriétaire' }, 201: { description: 'Création confirmée' }, 204: { description: 'Opération confirmée' }, 401: { description: 'Session invalide' }, 502: { description: 'Service indisponible' } } });
router.get('/attachments/:attachmentId', (req, res) => forward(req, res, 'EMAIL_API', `/api/v1/emails/attachments/${id(req.params.attachmentId)}/content` + (req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '')));

registry.registerPath({ method: 'patch', path: '/emails/messages/{messageId}/state', request: { params: z.object({ messageId: z.string() }), body: { required: true, content: { 'application/json': { schema: z.record(z.string(), z.unknown()) } } } }, responses: { 200: { description: 'Réponse de l’API propriétaire' }, 201: { description: 'Création confirmée' }, 204: { description: 'Opération confirmée' }, 401: { description: 'Session invalide' }, 502: { description: 'Service indisponible' } } });
router.patch('/messages/:messageId/state', (req, res) => forward(req, res, 'EMAIL_API', `/api/v1/emails/messages/${id(req.params.messageId)}/state`));

registry.registerPath({ method: 'delete', path: '/emails/messages/{messageId}', request: { params: z.object({ messageId: z.string() }) }, responses: { 200: { description: 'Réponse de l’API propriétaire' }, 201: { description: 'Création confirmée' }, 204: { description: 'Opération confirmée' }, 401: { description: 'Session invalide' }, 502: { description: 'Service indisponible' } } });
router.delete('/messages/:messageId', (req, res) => forward(req, res, 'EMAIL_API', `/api/v1/emails/messages/${id(req.params.messageId)}/`));

export default router;
