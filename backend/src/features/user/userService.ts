import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import { oauthService } from "../../services/oauth.service";
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
        throw { status: 400, message: "Email is required for JWT login." };
      }
      user = await userRepository.findByEmail(email);

      if (user) {
        if (isSignUp) {
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
          if (!valid) {
            throw { status: 401, message: "Invalid email or password." };
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
        throw { status: 400, message: "OAuth idToken is required." };
      }

      const identity = await oauthService.verify(provider, idToken);
      const resolvedEmail = identity.email ?? email;
      if (!resolvedEmail) {
        throw {
          status: 400,
          message:
            "OAuth email is unavailable. Please share email scope and try again.",
        };
      }
      if (email && resolvedEmail.toLowerCase() !== email.toLowerCase()) {
        throw {
          status: 400,
          message: "Provided email does not match OAuth token email.",
        };
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
        throw {
          status: 409,
          message:
            "This OAuth identity is already linked to another account.",
        };
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
      throw { status: 500, message: "Unable to complete authentication." };
    }

    const { password: _pwd, ...safeUser } = user;

    const token = jwt.sign(
      { id: safeUser.id, email: safeUser.email },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    return { user: safeUser, token };
  },
};
