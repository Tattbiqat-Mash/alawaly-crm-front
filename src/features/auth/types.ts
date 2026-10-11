// Shapes recorded in the Frontend Guide: POST /auth/login and GET /me.

export type StaffUser = { id: number; name: string; email: string; role_id: number | null };

export type Me = StaffUser & { permissions: string[] };

/** What the BFF returns from sign-in (the token stays in an httpOnly cookie). */
export type LoginResult = { user: StaffUser; permissions: string[] };

export type LoginInput = { email: string; password: string };
