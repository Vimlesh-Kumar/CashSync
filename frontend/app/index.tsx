import * as AuthSession from "expo-auth-session";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/src/context/AuthContext";
import { syncUser } from "@/src/features/user";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const { signIn } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const tabSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const switchTab = (toLogin: boolean) => {
    setIsLogin(toLogin);
    setError(null);
    setName("");
    setEmail("");
    setPassword("");
    Animated.spring(tabSlide, {
      toValue: toLogin ? 0 : 1,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim() || (!isLogin && !name.trim())) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const data = await syncUser({
        email: email.trim(),
        name: name.trim(),
        provider: "JWT",
        password,
        isSignUp: !isLogin,
      });

      if (data?.user && data?.token) {
        // signIn → saves to storage AND updates context → AuthGate redirects
        await signIn(data.user, data.token);
      } else {
        setError("Unexpected response from server.");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "GOOGLE" | "APPLE") => {
    setError(null);
    setLoading(true);
    try {
      const clientId =
        provider === "GOOGLE"
          ? process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID
          : process.env.EXPO_PUBLIC_APPLE_CLIENT_ID;
      if (!clientId) {
        throw new Error(
          `Missing ${provider} client ID. Set EXPO_PUBLIC_${provider}_CLIENT_ID.`,
        );
      }

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "cashsync",
        preferLocalhost: true,
      });

      const request = new AuthSession.AuthRequest({
        clientId,
        responseType: AuthSession.ResponseType.IdToken,
        redirectUri,
        scopes:
          provider === "GOOGLE"
            ? ["openid", "email", "profile"]
            : ["openid", "email", "name"],
        extraParams: {
          nonce: `${provider}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
      });

      const discovery =
        provider === "GOOGLE"
          ? {
              authorizationEndpoint:
                "https://accounts.google.com/o/oauth2/v2/auth",
              tokenEndpoint: "https://oauth2.googleapis.com/token",
            }
          : { authorizationEndpoint: "https://appleid.apple.com/auth/authorize" };

      const result = await request.promptAsync(discovery);
      if (result.type !== "success") {
        if (result.type === "cancel" || result.type === "dismiss") return;
        throw new Error(`${provider} authentication was not completed.`);
      }

      const idToken =
        (result.params?.id_token as string | undefined) ||
        (result.authentication as any)?.idToken;
      if (!idToken) {
        throw new Error(`${provider} did not return an id_token.`);
      }

      const data = await syncUser({
        provider,
        idToken,
        email: email.trim() || undefined,
        name: name.trim() || undefined,
      });
      if (data?.user && data?.token) {
        await signIn(data.user, data.token);
      }
    } catch (err: any) {
      setError(err.message || `${provider} sign-in failed.`);
    } finally {
      setLoading(false);
    }
  };

  const tabIndicatorLeft = tabSlide.interpolate({
    inputRange: [0, 1],
    outputRange: ["2%", "52%"],
  });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0D1117", "#111827", "#0D1117"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative blobs */}
      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobBottomRight]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              width: "100%",
              alignItems: "center",
            }}
          >
            {/* ─── Logo & Headline ─── */}
            <View style={styles.hero}>
              <View style={styles.logoMark}>
                <Text style={styles.logoMarkText}>CS</Text>
              </View>
              <Text style={styles.appName}>CashSync</Text>
              <Text style={styles.tagline}>
                Smart money tracking,{"\n"}beautifully simple.
              </Text>
            </View>

            {/* ─── Auth Card ─── */}
            <View style={styles.card}>
              {/* Sliding Tab Switcher */}
              <View style={styles.tabBar}>
                <Animated.View
                  style={[styles.tabIndicator, { left: tabIndicatorLeft }]}
                />
                <Pressable
                  style={styles.tabBtn}
                  onPress={() => switchTab(true)}
                >
                  <Text
                    style={[styles.tabLabel, isLogin && styles.tabLabelActive]}
                  >
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.tabBtn}
                  onPress={() => switchTab(false)}
                >
                  <Text
                    style={[styles.tabLabel, !isLogin && styles.tabLabelActive]}
                  >
                    Create Account
                  </Text>
                </Pressable>
              </View>

              {/* Form */}
              <View style={styles.form}>
                {!isLogin && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Full Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Vimlesh Kumar"
                      placeholderTextColor="#3D4E68"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      selectionColor="#4F8EF7"
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="hello@cashsync.app"
                    placeholderTextColor="#3D4E68"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    selectionColor="#4F8EF7"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.inputLabel}>Password</Text>
                    {isLogin && (
                      <Pressable>
                        <Text style={styles.forgotText}>Forgot?</Text>
                      </Pressable>
                    )}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Min. 6 characters"
                    placeholderTextColor="#3D4E68"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    selectionColor="#4F8EF7"
                  />
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>⚠ {error}</Text>
                  </View>
                ) : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.primaryBtnPressed,
                  ]}
                  onPress={handleAuth}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      {isLogin ? "Sign In →" : "Create Account →"}
                    </Text>
                  )}
                </Pressable>
              </View>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* OAuth */}
              <View style={styles.oauthRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.oauthBtn,
                    pressed && styles.oauthBtnPressed,
                  ]}
                  onPress={() => handleOAuth("GOOGLE")}
                  disabled={loading}
                >
                  <Text style={styles.oauthIcon}>G</Text>
                  <Text style={styles.oauthLabel}>Google</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.oauthBtn,
                    pressed && styles.oauthBtnPressed,
                  ]}
                  onPress={() => handleOAuth("APPLE")}
                  disabled={loading}
                >
                  <Text style={styles.oauthIcon}></Text>
                  <Text style={styles.oauthLabel}>Apple</Text>
                </Pressable>
              </View>

              <Text style={styles.footerNote}>
                Sign in with the same email across Google, Apple, or password —
                we link them automatically.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const CARD_MAX_WIDTH = 480;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0D1117",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.12,
  },
  blobTopLeft: {
    width: 320,
    height: 320,
    backgroundColor: "#4F8EF7",
    top: -80,
    left: -100,
  },
  blobBottomRight: {
    width: 260,
    height: 260,
    backgroundColor: "#9B59F5",
    bottom: -60,
    right: -60,
  },
  hero: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoMark: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#4F8EF7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: "0 8px 32px rgba(79, 142, 247, 0.45)" },
      default: {
        shadowColor: "#4F8EF7",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 10,
      },
    }),
  },
  logoMarkText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },
  appName: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: "#8B9AB3",
    textAlign: "center",
    lineHeight: 24,
  },
  card: {
    width: "100%",
    maxWidth: CARD_MAX_WIDTH,
    backgroundColor: "#161D2C",
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: "#1E2D46",
    ...Platform.select({
      web: { boxShadow: "0 24px 64px rgba(0,0,0,0.7)" },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 40,
        elevation: 12,
      },
    }),
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#0D1117",
    borderRadius: 14,
    padding: 4,
    marginBottom: 28,
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    width: "48%",
    backgroundColor: "#4F8EF7",
    borderRadius: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    zIndex: 1,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A5568",
  },
  tabLabelActive: {
    color: "#FFFFFF",
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8B9AB3",
    letterSpacing: 0.3,
  },
  forgotText: {
    fontSize: 13,
    color: "#4F8EF7",
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#0D1117",
    borderWidth: 1.5,
    borderColor: "#1E2D46",
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    color: "#FFFFFF",
    fontSize: 16,
    outlineStyle: "none",
  } as any,
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    padding: 12,
  },
  errorText: {
    color: "#F87171",
    fontSize: 13,
    fontWeight: "500",
  },
  primaryBtn: {
    backgroundColor: "#4F8EF7",
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 4,
    ...Platform.select({
      web: { boxShadow: "0 4px 20px rgba(79, 142, 247, 0.4)" },
      default: {
        shadowColor: "#4F8EF7",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  primaryBtnPressed: {
    opacity: 0.85,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1E2D46",
  },
  dividerLabel: {
    color: "#3D4E68",
    fontSize: 12,
    fontWeight: "600",
  },
  oauthRow: {
    flexDirection: "row",
    gap: 12,
  },
  oauthBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    backgroundColor: "#0D1117",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#1E2D46",
  },
  oauthBtnPressed: {
    borderColor: "#4F8EF7",
    backgroundColor: "rgba(79, 142, 247, 0.06)",
  },
  oauthIcon: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  oauthLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8B9AB3",
  },
  footerNote: {
    color: "#3D4E68",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 20,
  },
});
