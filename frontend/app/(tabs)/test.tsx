import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { SafeAreaView } from "react-native-safe-area-context";
import api from "../../lib/api";
import { useSessionStore } from "../../store/sessionStore";
import type { HeatmapResponse } from "../../types";

export default function TestScreen() {
  const router = useRouter();
  const startSession = useSessionStore((s) => s.startSession);

  const { data: heatmap, isLoading } = useQuery<HeatmapResponse>({
    queryKey: ["heatmap"],
    queryFn: () => api.get("/api/analytics/heatmap").then((r) => r.data),
  });

  const startTest = async (type: string, count: number, topicSlug?: string) => {
    try {
      const res = await api.post("/api/attempts/sessions", {
        session_type: type,
        total_questions: count,
      });
      startSession(res.data.id, type, count);
      const topicParam = topicSlug ? `?topic=${topicSlug}` : "";
      router.push(`/question/${res.data.id}${topicParam}`);
    } catch (err) {
      console.error("Failed to start test:", err);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={["top"]}>
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        <Text className="text-white text-xl font-bold mt-4 mb-6">Practice</Text>

        {/* Quick start cards */}
        <View className="gap-3 mb-8">
          <TouchableOpacity
            onPress={() => startTest("daily_quiz", 10)}
            className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4"
            activeOpacity={0.7}
          >
            <Text className="text-white text-base font-semibold mb-1">
              Daily Quiz
            </Text>
            <Text className="text-slate-400 text-sm">
              10 mixed questions across all topics
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => startTest("quick_practice", 5)}
            className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4"
            activeOpacity={0.7}
          >
            <Text className="text-white text-base font-semibold mb-1">
              Quick Practice
            </Text>
            <Text className="text-slate-400 text-sm">
              5 questions for a quick revision
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => startTest("full_test", 25)}
            className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4"
            activeOpacity={0.7}
          >
            <Text className="text-white text-base font-semibold mb-1">
              Full Mock Test
            </Text>
            <Text className="text-slate-400 text-sm">
              25 questions simulating the real exam
            </Text>
          </TouchableOpacity>
        </View>

        {/* Topic-wise practice */}
        <Text className="text-white text-lg font-bold mb-3">Practice by Topic</Text>
        {isLoading ? (
          <ActivityIndicator color="#06b6d4" className="my-8" />
        ) : (
          <View className="gap-3 mb-8">
            {heatmap?.topics.map((t) => (
              <TouchableOpacity
                key={t.slug}
                onPress={() => startTest("topic_practice", 10, t.slug)}
                className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex-row items-center"
                activeOpacity={0.7}
              >
                <Text className="text-2xl mr-3">{t.icon ?? "📖"}</Text>
                <View className="flex-1">
                  <Text className="text-white text-sm font-semibold">{t.topic}</Text>
                  <Text className="text-slate-400 text-xs">
                    {t.total_attempted > 0
                      ? `${Math.round(t.accuracy ?? 0)}% accuracy · ${t.total_attempted} attempted`
                      : "Not started yet"}
                  </Text>
                </View>
                <Text className="text-slate-500">→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
