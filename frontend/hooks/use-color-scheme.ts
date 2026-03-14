import { useAppTheme } from "@/src/context/ThemeContext";

export function useColorScheme() {
  return useAppTheme().resolvedTheme;
}
