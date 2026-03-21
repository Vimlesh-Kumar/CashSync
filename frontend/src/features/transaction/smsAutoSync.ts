import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  checkIfHasSMSPermission,
  requestReadSMSPermission,
  startReadSMS,
  stopReadSMS,
} from "@maniac-tech/react-native-expo-read-sms";
import { Platform } from "react-native";

export const SMS_AUTO_SYNC_KEY = "sms_auto_sync_enabled";

export type SmsPermissionState = "unsupported" | "unknown" | "granted" | "denied";

export async function getSmsAutoSyncEnabled() {
  const value = await AsyncStorage.getItem(SMS_AUTO_SYNC_KEY);
  return value === "true";
}

export async function setSmsAutoSyncEnabled(enabled: boolean) {
  await AsyncStorage.setItem(SMS_AUTO_SYNC_KEY, enabled ? "true" : "false");
}

export async function getSmsPermissionState(): Promise<SmsPermissionState> {
  if (Platform.OS !== "android") {
    return "unsupported";
  }

  const permissions = await checkIfHasSMSPermission();
  return permissions.hasReadSmsPermission && permissions.hasReceiveSmsPermission
    ? "granted"
    : "unknown";
}

export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") {
    return false;
  }

  return requestReadSMSPermission();
}

export async function beginSmsListener(
  onIncomingMessage: (rawSms: string) => Promise<void> | void,
  onError?: (message: string) => void,
) {
  if (Platform.OS !== "android") {
    return () => {};
  }

  await startReadSMS(async (status, sms, error) => {
    if (status === "success" && sms) {
      const rawSms = extractSmsBody(sms);
      if (rawSms) {
        await onIncomingMessage(rawSms);
      }
      return;
    }

    if (status === "error" && error) {
      onError?.(error);
    }
  });

  return () => {
    stopReadSMS();
  };
}

function extractSmsBody(payload: string) {
  const trimmed = payload.trim();
  const bracketMatch = trimmed.match(/^\[(.*)\]$/);
  if (!bracketMatch) {
    return trimmed;
  }

  const inner = bracketMatch[1] ?? "";
  const firstCommaIndex = inner.indexOf(",");
  if (firstCommaIndex === -1) {
    return inner.trim();
  }

  return inner.slice(firstCommaIndex + 1).trim();
}
