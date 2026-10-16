import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { AppEnv } from '../../env';
import { ApiError } from '../../lib/errors';
import { requireStaff, staffCsrf, withDb } from '../../middleware/staff';
import { adminAccounts, adminReference } from './accounts';
import { adminActions } from './actions';
import { adminAudit } from './audit';
import { adminAuth } from './auth';
import { adminMe } from './me';
import { adminMoney } from './money';
import { adminOperations } from './operations';
import { adminPeople } from './people';
import { adminProviders } from './providers';
import { adminServices } from './services';

/**
 * Staff console API (`/api/v1/admin/*`, ADR-011). Cookie session + CSRF guard on every
 * route; everything except sign-in requires a session, and account management requires
 * SUPER_ADMIN. Every write and sensitive read is audited.
 */
export const admin = new Hono<AppEnv>();

admin.use(
  '*',
  bodyLimit({
    maxSize: 32 * 1024,
    onError: () => {
      throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The request is too large.');
    },
  }),
);
admin.use('*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
});
admin.use('*', staffCsrf);
admin.use('*', withDb);

// Guards are attached by path (not via sub-app `use('*')`, which Hono would apply to every admin route).
for (const path of ['/me', '/me/*', '/municipalities', '/audit']) admin.use(path, requireStaff());
// Operations dashboards: any staff member, always limited to their municipalities inside the handlers.
for (const path of ['/overview', '/requests', '/requests/*', '/shifts', '/clients', '/clients/*', '/caregivers', '/caregivers/*', '/providers', '/providers/*', '/payments', '/exports/*', '/service-requests', '/service-requests/*']) {
  admin.use(path, requireStaff());
}
for (const path of ['/accounts', '/accounts/*']) admin.use(path, requireStaff('SUPER_ADMIN'));

admin.route('/', adminAuth);
admin.route('/', adminMe);
admin.route('/', adminReference);
admin.route('/', adminAudit);
admin.route('/', adminAccounts);
admin.route('/', adminActions);
admin.route('/', adminOperations);
admin.route('/', adminPeople);
admin.route('/', adminProviders);
admin.route('/', adminMoney);
admin.route('/', adminServices);
