import { post, get } from "./api";

interface LoginRequest {
  username: string;
  password: string;
}

interface UserResponse {
  id: string;
  username: string;
  role: "owner" | "manager" | "kasir";
  outlet_id: string | null;
}

interface LoginResponse {
  user: UserResponse;
}

export async function login(req: LoginRequest): Promise<LoginResponse> {
  return post<LoginResponse>("/auth/login", req);
}

export async function getProfile(): Promise<UserResponse> {
  return get<UserResponse>("/me");
}
