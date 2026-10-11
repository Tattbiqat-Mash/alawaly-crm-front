import { ownerEndpoints } from "@/config/endpoints";
import { ownerApi } from "@/lib/api/client";
import type { Envelope } from "@/lib/api/envelope";

export type OwnerClient = { id: number; name: string };

// The owner BFF keeps the phone between steps and the token in httpOnly cookies.
export const ownerAuthApi = {
  requestCode: (phone: string) =>
    ownerApi.post<Envelope<{ sent: boolean }>>(ownerEndpoints.requestCode, { phone }).then((r) => r.data.data),
  verify: (code: string) =>
    ownerApi.post<Envelope<{ client: OwnerClient }>>(ownerEndpoints.verify, { code }).then((r) => r.data.data),
  logout: () => ownerApi.post(ownerEndpoints.logout),
};
