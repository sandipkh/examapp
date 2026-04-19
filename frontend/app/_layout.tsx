import { Stack, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { useAuthStore } from "../store/authStore";
import "../global.css";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="question/[sessionId]"
          options={{ gestureEnabled: false }}
        />
      </Stack>
    </QueryClientProvider>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }
  return <>{children}</>;
}
