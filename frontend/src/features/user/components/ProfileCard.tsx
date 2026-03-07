import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

interface ProfileCardProps {
  name: string;
  email: string;
  balance: number;
  imageUrl?: string;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  email,
  balance,
  imageUrl,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{name}</Text>
        </View>
        <Image
          source={{ uri: imageUrl || "https://via.placeholder.com/150" }}
          style={styles.avatar}
        />
      </View>

      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balance}>${balance.toFixed(2)}</Text>
      </View>

      <View style={styles.emailContainer}>
        <Text style={styles.email}>{email}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8, // For Android
    marginVertical: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    fontFamily: "sans-serif", // Will be updated to Inter/Outfit later
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#39FF14", // Neon Green accent
  },
  balanceContainer: {
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 8,
  },
  balance: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  emailContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 16,
  },
  email: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
  },
});
