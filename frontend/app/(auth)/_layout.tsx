import { Stack, Redirect } from "expo-router";
import { useAuthStore } from "../../store/authStore";

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const needsProfileSetup = useAuthStore((s) => s.needsProfileSetup);

  if (isAuthenticated && !needsProfileSetup) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack
      initialRouteName="login"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#020617" },
      }}
    />
  );
}
