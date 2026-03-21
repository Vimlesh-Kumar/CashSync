import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";

import { getCurrencyMeta, normalizeCurrency } from "@/src/lib/currency";

type CurrencyFlagProps = Readonly<{
  currency?: string | null;
  size?: number;
}>;

export function CurrencyFlag({ currency, size = 18 }: CurrencyFlagProps) {
  const meta = getCurrencyMeta(normalizeCurrency(currency));
  const width = Math.round(size * 1.4);
  const height = size;
  const borderRadius = Math.max(4, Math.round(size * 0.22));

  return (
    <View
      style={[
        styles.flag,
        {
          width,
          height,
          borderRadius,
        },
      ]}
    >
      <Image
        source={{ uri: getFlagUri(meta.countryCode) }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="disk"
      />
    </View>
  );
}

function getFlagUri(countryCode: string) {
  const normalized = countryCode.toLowerCase();
  if (normalized === "eu") {
    return "https://hatscripts.github.io/circle-flags/flags/eu.svg";
  }
  return `https://flagcdn.com/w80/${normalized}.png`;
}

const styles = StyleSheet.create({
  flag: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#FFFFFF",
  },
});
