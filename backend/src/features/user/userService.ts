import type { User } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { oauthService } from "../../services/oauth.service";
import { userRepository } from "./userRepository";
import { AuthResponse, UpdateUserRequest } from "./userSchema";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key";
const SALT_ROUNDS = 10;

type HttpError = Error & { status: number };

function createHttpError(status: number, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.status = status;
  return error;
}

// ─── User Service ─────────────────────────────────────────────────────────────
// All business logic. No Express types. No Prisma. No req/res.

export class UserService {
  async getAllUsers() {
    return await userRepository.findAll();
  }

  async getProfile(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw createHttpError(404, "User not found.");
    return user;
  }

  async updateUser(id: string, data: UpdateUserRequest) {
    const user = await userRepository.findById(id);
    if (!user) throw createHttpError(404, "User not found.");

    return await userRepository.updateProfile(id, data);
  }

  async deleteUser(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw createHttpError(404, "User not found.");

    return await userRepository.delete(id);
  }

  async syncIdentity(params: {
    email?: string;
    name?: string;
    provider: "GOOGLE" | "APPLE" | "JWT";
    idToken?: string;
    password?: string;
    isSignUp?: boolean;
  }): Promise<AuthResponse> {
    const { email, name, provider, idToken, password, isSignUp } = params;

    let user: User | null = null;

    if (provider === "JWT") {
      if (!email) {
        throw createHttpError(400, "Email is required for JWT login.");
      }
      user = await userRepository.findByEmail(email);

      if (user) {
        if (isSignUp) {
          const hashed = await bcrypt.hash(password!, SALT_ROUNDS);
          user = await userRepository.updatePassword(user.id, hashed);
        } else {
          if (!user.password) {
            throw createHttpError(400, "This email is linked to a social provider. Sign in via Google or Apple.");
          }
          const valid = await bcrypt.compare(password!, user.password);
          if (!valid) {
            throw createHttpError(401, "Invalid email or password.");
          }
        }
      } else {
        const hashed = await bcrypt.hash(password!, SALT_ROUNDS);
        user = await userRepository.create({
          email,
          name,
          provider: "JWT",
          providerId: null,
          password: hashed,
        });
      }
    } else {
      if (!idToken) {
        throw createHttpError(400, "OAuth idToken is required.");
      }

      const identity = await oauthService.verify(provider, idToken);
      const resolvedEmail = identity.email ?? email;
      if (!resolvedEmail) {
        throw createHttpError(400, "OAuth email is unavailable. Please share email scope and try again.");
      }
      if (email && resolvedEmail.toLowerCase() !== email.toLowerCase()) {
        throw createHttpError(400, "Provided email does not match OAuth token email.");
      }

      const linkedByProvider = await userRepository.findByAuthProvider(
        provider,
        identity.providerUserId
      );
      const userByEmail = await userRepository.findByEmail(resolvedEmail);

      if (
        linkedByProvider &&
        userByEmail &&
        linkedByProvider.user.id !== userByEmail.id
      ) {
        throw createHttpError(409, "This OAuth identity is already linked to another account.");
      }

      user = linkedByProvider?.user ?? userByEmail;

      if (!user) {
        user = await userRepository.create({
          email: resolvedEmail,
          name: identity.name ?? name,
          provider,
          providerId: identity.providerUserId,
          password: null,
        });
      }

      user = await userRepository.updateOAuth(user.id, {
        provider,
        providerId: identity.providerUserId,
        name: user.name ?? identity.name ?? name ?? null,
      });

      if (identity.avatarUrl || (!user.name && identity.name)) {
        user = await userRepository.updateProfile(user.id, {
          avatarUrl: identity.avatarUrl ?? user.avatarUrl,
          name: user.name ?? identity.name ?? name ?? null,
        });
      }

      await userRepository.upsertAuthProvider({
        userId: user.id,
        provider,
        providerUserId: identity.providerUserId,
        email: resolvedEmail,
        emailVerified: identity.emailVerified,
      });
    }

    // Strip password from response
    if (!user) {
      throw createHttpError(500, "Unable to complete authentication.");
    }

    const { password: _pwd, ...safeUser } = user;

    const token = jwt.sign(
      { id: safeUser.id, email: safeUser.email },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return { user: safeUser, token };
  }
}

export const userService = new UserService();
