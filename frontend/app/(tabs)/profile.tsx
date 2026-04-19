import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { signOutUser } from "../../lib/firebase";
import type { StatsResponse } from "../../types";

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const { data: stats } = useQuery<StatsResponse>({
    queryKey: ["stats"],
    queryFn: () => api.get("/api/analytics/stats").then((r) => r.data),
  });

  const handleSignOut = async () => {
    await signOutUser();
    clearAuth();
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={["top"]}>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <Text className="text-white text-xl font-bold mt-4 mb-6">Profile</Text>

        {/* User info card */}
        <View className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 items-center mb-6">
          <View className="w-16 h-16 rounded-full bg-blue-600/30 items-center justify-center mb-3">
            <Text className="text-3xl">👤</Text>
          </View>
          <Text className="text-white text-lg font-bold">
            {user?.name ?? "UPSC Aspirant"}
          </Text>
          <Text className="text-slate-400 text-sm mt-1">
            {user?.email ?? ""}
          </Text>
          <View className="bg-blue-600/20 border border-blue-500/30 rounded-full px-3 py-1 mt-3">
            <Text className="text-blue-400 text-xs font-semibold uppercase">
              {user?.plan ?? "free"} plan
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 items-center">
            <Text className="text-white text-xl font-bold">
              {stats?.total_attempted ?? 0}
            </Text>
            <Text className="text-slate-400 text-xs mt-1">Questions</Text>
          </View>
          <View className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 items-center">
            <Text className="text-white text-xl font-bold">
              {stats ? `${Math.round(stats.overall_accuracy)}%` : "0%"}
            </Text>
            <Text className="text-slate-400 text-xs mt-1">Accuracy</Text>
          </View>
          <View className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 items-center">
            <Text className="text-white text-xl font-bold">
              {stats?.longest_streak ?? 0}
            </Text>
            <Text className="text-slate-400 text-xs mt-1">Best Streak</Text>
          </View>
        </View>

        {/* Menu items */}
        <View className="gap-2 mb-8">
          <View className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <Text className="text-white text-sm font-medium">
              Subscription & Plans
            </Text>
            <Text className="text-slate-400 text-xs mt-0.5">
              Manage your plan
            </Text>
          </View>
          <View className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <Text className="text-white text-sm font-medium">
              Notifications
            </Text>
            <Text className="text-slate-400 text-xs mt-0.5">
              Reminder preferences
            </Text>
          </View>
          <View className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
            <Text className="text-white text-sm font-medium">About</Text>
            <Text className="text-slate-400 text-xs mt-0.5">
              Version 1.0.0
            </Text>
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="border border-red-500/30 rounded-xl py-4 items-center mb-8"
          activeOpacity={0.7}
        >
          <Text className="text-red-400 text-base font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
