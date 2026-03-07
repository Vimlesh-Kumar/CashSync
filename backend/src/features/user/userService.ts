import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { userRepository } from "./userRepository";
import { AuthResponse } from "./userSchema";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";
const SALT_ROUNDS = 10;

// ─── User Service ─────────────────────────────────────────────────────────────
// All business logic. No Express types. No Prisma. No req/res.

export const userService = {
  async getProfile(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw { status: 404, message: "User not found." };
    return user;
  },

  async syncIdentity(params: {
    email: string;
    name?: string;
    provider: "GOOGLE" | "APPLE" | "JWT";
    providerId?: string;
    password?: string;
    isSignUp?: boolean;
  }): Promise<AuthResponse> {
    const { email, name, provider, providerId, password, isSignUp } = params;

    let user = await userRepository.findByEmail(email);

    if (user) {
      // ── Existing user — identity linking ──────────────────────────────
      if (provider === "JWT") {
        if (isSignUp) {
          // Link a password to an existing OAuth account (or re-set it)
          const hashed = await bcrypt.hash(password!, SALT_ROUNDS);
          user = await userRepository.updatePassword(user.id, hashed);
        } else {
          if (!user.password) {
            throw {
              status: 400,
              message:
                "This email is linked to a social provider. Sign in via Google or Apple.",
            };
          }
          const valid = await bcrypt.compare(password!, user.password);
          if (!valid)
            throw { status: 401, message: "Invalid email or password." };
        }
      } else {
        // OAuth — refresh provider metadata
        user = await userRepository.updateOAuth(user.id, {
          provider,
          providerId: providerId ?? null,
          name: user.name ?? name,
        });
      }
    } else {
      // ── New user ───────────────────────────────────────────────────────
      const hashed =
        provider === "JWT" ? await bcrypt.hash(password!, SALT_ROUNDS) : null;

      user = await userRepository.create({
        email,
        name,
        provider,
        providerId: providerId ?? null,
        password: hashed,
      });
    }

    // Strip password from response
    const { password: _pwd, ...safeUser } = user;

    const token = jwt.sign(
      { id: safeUser.id, email: safeUser.email },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return { user: safeUser, token };
  },
};
