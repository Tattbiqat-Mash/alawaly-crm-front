import { staffEndpoints } from "@/config/endpoints";
import { staffApi } from "@/lib/api/client";
import type { Envelope } from "@/lib/api/envelope";
import type { LoginInput, LoginResult, Me } from "./types";

export const authApi = {
  login: (body: LoginInput) => staffApi.post<Envelope<LoginResult>>(staffEndpoints.login, body).then((r) => r.data.data),
  me: () => staffApi.get<Envelope<Me>>(staffEndpoints.me).then((r) => r.data.data),
  logout: () => staffApi.post(staffEndpoints.logout),
};
