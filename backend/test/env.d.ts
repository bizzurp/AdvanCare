import type { Bindings } from '../src/env';

declare global {
  namespace Cloudflare {
    interface Env extends Bindings {
      TEST_HAS_DATABASE: 'true' | 'false';
    }
  }
}
