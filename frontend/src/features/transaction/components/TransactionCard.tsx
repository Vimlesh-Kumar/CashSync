import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/src/context/ThemeContext";
import { Transaction } from "../api/transaction.api";
import { formatCurrency } from "@/src/lib/currency";

// Simple category to icon/color matcher
const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case "food":
      return { emoji: "🍔", color: "#FF6B6B" };
    case "travel":
      return { emoji: "✈️", color: "#4ECDC4" };
    case "subscription":
      return { emoji: "🎬", color: "#FFD93D" };
    case "salary":
      return { emoji: "💰", color: "#6BCB77" };
    case "shopping":
      return { emoji: "🛍️", color: "#C689C6" };
    default:
      return { emoji: "💸", color: "#888888" };
  }
};

export const TransactionCard: React.FC<{ transaction: Transaction }> = ({
  transaction,
}) => {
  const { colors } = useAppTheme();
  const styles = getStyles(colors);
  const isCredit = transaction.type === "INCOME";
  const displayAmount = isCredit
    ? `+${formatCurrency(transaction.amount, transaction.currency)}`
    : `-${formatCurrency(transaction.amount, transaction.currency)}`;
  const { emoji, color } = getCategoryIcon(transaction.category || "General");
  const reviewMeta =
    transaction.reviewState === "SPLIT"
      ? {
          label: "Split",
          color: "#A1CEDC",
          background: "rgba(161, 206, 220, 0.1)",
        }
      : transaction.reviewState === "PERSONAL"
        ? {
            label: "Personal",
            color: "#39FF14",
            background: "rgba(57, 255, 20, 0.1)",
          }
        : {
            label: "Needs Label",
            color: "#FFD93D",
            background: "rgba(255, 217, 61, 0.12)",
          };

  return (
    <View style={styles.card}>
      <View style={styles.leftGroup}>
        <View style={[styles.avatar, { backgroundColor: color + "20" }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>{transaction.title}</Text>
          <Text style={styles.meta}>
            {transaction.category || "General"} •{" "}
            {new Date(transaction.date).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.rightGroup}>
        <Text
          style={[styles.amount, { color: isCredit ? colors.success : colors.text }]}
        >
          {displayAmount}
        </Text>
        <Text
          style={[
            styles.sharedBadge,
            {
              color: reviewMeta.color,
              backgroundColor: reviewMeta.background,
            },
          ]}
        >
          {reviewMeta.label}
        </Text>
      </View>
    </View>
  );
};

const getStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  emoji: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rightGroup: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  sharedBadge: {
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden",
  },
});
