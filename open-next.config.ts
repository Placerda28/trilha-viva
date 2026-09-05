import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// O site é todo pré-renderizado (sem ISR, sem middleware, sem next/image),
// então não precisamos de cache incremental em R2 nem de self-reference.
export default defineCloudflareConfig()
