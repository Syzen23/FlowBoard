import { apiClient } from "@/src/lib/apiClient";

export type AuthMeResponse = {
  uid: string;
  email: string | null;
};

export function getAuthenticatedUser() {
  return apiClient.get<AuthMeResponse>("/auth/me");
}
