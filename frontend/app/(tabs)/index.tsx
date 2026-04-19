import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import { useSessionStore } from "../../store/sessionStore";
import type { StatsResponse, HeatmapResponse, TopicHeatmapItem } from "../../types";

const STRENGTH_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  strong: { bg: "bg-emerald-500/20", border: "border-emerald-500/30", text: "text-emerald-400" },
  moderate: { bg: "bg-amber-500/20", border: "border-amber-500/30", text: "text-amber-400" },
  weak: { bg: "bg-red-500/20", border: "border-red-500/30", text: "text-red-400" },
  unattempted: { bg: "bg-slate-700/40", border: "border-slate-600/30", text: "text-slate-400" },
};

function TopicCell({ item, onPress }: { item: TopicHeatmapItem; onPress: () => void }) {
  const style = STRENGTH_STYLES[item.strength] ?? STRENGTH_STYLES.unattempted;
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`${style.bg} border ${style.border} rounded-xl p-3 items-center`}
      activeOpacity={0.7}
    >
      <Text className="text-2xl mb-1">{item.icon ?? "📖"}</Text>
      <Text className="text-white text-xs font-medium text-center mb-1" numberOfLines={2}>
        {item.topic}
      </Text>
      <Text className={`text-xs font-semibold ${style.text}`}>
        {item.total_attempted > 0 ? `${Math.round(item.accuracy ?? 0)}%` : "New"}
      </Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const startSession = useSessionStore((s) => s.startSession);

  const { data: stats, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ["stats"],
    queryFn: () => api.get("/api/analytics/stats").then((r) => r.data),
  });

  const { data: heatmap, isLoading: heatmapLoading } = useQuery<HeatmapResponse>({
    queryKey: ["heatmap"],
    queryFn: () => api.get("/api/analytics/heatmap").then((r) => r.data),
  });

  const xpTotal = (stats?.total_attempted ?? 0) * 10;
  const xpMax = 500;
  const xpProgress = Math.min(xpTotal / xpMax, 1);

  const handleStartTest = async () => {
    try {
      const res = await api.post("/api/attempts/sessions", {
        session_type: "daily_quiz",
        total_questions: 10,
      });
      startSession(res.data.id, "daily_quiz", 10);
      router.push(`/question/${res.data.id}`);
    } catch (err) {
      console.error("Failed to create session:", err);
    }
  };

  const handleStartTopicTest = async (topicSlug: string) => {
    try {
      const res = await api.post("/api/attempts/sessions", {
        session_type: "topic_practice",
        total_questions: 10,
      });
      startSession(res.data.id, "topic_practice", 10);
      router.push(`/question/${res.data.id}?topic=${topicSlug}`);
    } catch (err) {
      console.error("Failed to create topic session:", err);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={["top"]}>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between mt-4 mb-6">
          <View>
            <Text className="text-white text-xl font-bold">UPSC IAS Prep</Text>
          </View>
          <View className="bg-amber-500/20 border border-amber-500/30 rounded-full px-3 py-1 flex-row items-center">
            <Text className="text-amber-400 text-sm font-bold">
              🔥 {stats?.current_streak ?? 0}
            </Text>
          </View>
        </View>

        {/* XP Progress */}
        <View className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 mb-4">
          <View className="flex-row justify-between mb-2">
            <Text className="text-slate-400 text-sm">XP Progress</Text>
            <Text className="text-slate-300 text-sm font-semibold">
              {xpTotal} / {xpMax} XP
            </Text>
          </View>
          <View className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <View
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${xpProgress * 100}%` }}
            />
          </View>
        </View>

        {/* Stats row */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 items-center">
            <Text className="text-white text-2xl font-bold">
              {stats?.total_attempted ?? 0}
            </Text>
            <Text className="text-slate-400 text-xs mt-1">Attempted</Text>
          </View>
          <View className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 items-center">
            <Text className="text-white text-2xl font-bold">
              {stats ? `${Math.round(stats.overall_accuracy)}%` : "0%"}
            </Text>
            <Text className="text-slate-400 text-xs mt-1">Accuracy</Text>
          </View>
          <View className="flex-1 bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 items-center">
            <Text className="text-white text-2xl font-bold">
              {stats?.current_streak ?? 0}
            </Text>
            <Text className="text-slate-400 text-xs mt-1">Streak days</Text>
          </View>
        </View>

        {/* Syllabus Mastery */}
        <Text className="text-white text-lg font-bold mb-3">Syllabus Mastery</Text>
        {heatmapLoading ? (
          <ActivityIndicator color="#06b6d4" className="my-8" />
        ) : (
          <View className="flex-row flex-wrap gap-3 mb-6">
            {heatmap?.topics.map((item) => (
              <View key={item.slug} style={{ width: "31%" }}>
                <TopicCell
                  item={item}
                  onPress={() => {
                    handleStartTopicTest(item.slug);
                  }}
                />
              </View>
            ))}
          </View>
        )}

        {/* Start Today's Test */}
        <TouchableOpacity
          onPress={handleStartTest}
          className="rounded-xl py-4 items-center mb-8 bg-blue-600"
          activeOpacity={0.8}
        >
          <Text className="text-white text-base font-semibold">
            Start Today's Test
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
