import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AxiosError } from "axios";
import api from "../../lib/api";
import { useSessionStore } from "../../store/sessionStore";
import type { Question, SubmitAttemptResponse, StatsResponse } from "../../types";

type OptionKey = "A" | "B" | "C" | "D";

interface SessionSummary {
  correctCount: number;
  attemptedCount: number;
  xpEarned: number;
  streak: number;
}

export default function QuestionScreen() {
  const { sessionId, topic } = useLocalSearchParams<{
    sessionId: string;
    topic?: string;
  }>();
  const router = useRouter();

  const { currentQuestionIndex, totalQuestions, incrementQuestion, endSession } =
    useSessionStore();

  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [allCaughtUp, setAllCaughtUp] = useState(false);
  const [paywallBlocked, setPaywallBlocked] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [selectedDisplayKey, setSelectedDisplayKey] = useState<OptionKey | null>(null);
  const [result, setResult] = useState<SubmitAttemptResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timer, setTimer] = useState(90);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const correctCountRef = useRef(0);
  const attemptedCountRef = useRef(0);

  const finishSession = useCallback(async () => {
    try {
      await api.put(`/api/attempts/sessions/${sessionId}/complete`);
    } catch (err) {
      console.error("Failed to complete session:", err);
    }

    let streak = 0;
    try {
      const stats = await api.get<StatsResponse>("/api/analytics/stats");
      streak = stats.data.current_streak;
    } catch {}

    const correct = correctCountRef.current;
    const attempted = attemptedCountRef.current;
    setSessionSummary({
      correctCount: correct,
      attemptedCount: attempted,
      xpEarned: correct * 10 + (attempted - correct) * 2,
      streak,
    });
    endSession();
  }, [sessionId, endSession]);

  // Fetch question
  const fetchQuestion = useCallback(async () => {
    setLoading(true);
    setSelectedDisplayKey(null);
    setResult(null);
    setTimer(90);
    try {
      const params: Record<string, string> = {};
      if (topic) params.topic_slug = topic;
      if (sessionId) params.session_id = sessionId;
      const res = await api.get<Question>("/api/questions/next", { params });
      setQuestion(res.data);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 404) {
        setAllCaughtUp(true);
        await finishSession();
      } else if (err instanceof AxiosError && err.response?.status === 403) {
        setPaywallBlocked(true);
      } else {
        console.error("Failed to fetch question:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [topic, finishSession]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  // Timer
  useEffect(() => {
    if (result) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [result, question?.id]);

  // Shuffle options
  const shuffledOptions = useMemo(() => {
    if (!question) return [];
    const opts = [
      { originalKey: "A" as const, text: question.options.A },
      { originalKey: "B" as const, text: question.options.B },
      { originalKey: "C" as const, text: question.options.C },
      { originalKey: "D" as const, text: question.options.D },
    ];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts.map((opt, i) => ({
      ...opt,
      displayKey: (["A", "B", "C", "D"] as const)[i],
    }));
  }, [question?.id]);

  const handleSubmit = async () => {
    if (!selectedDisplayKey || !question) return;
    const selected = shuffledOptions.find(
      (o) => o.displayKey === selectedDisplayKey
    );
    if (!selected) return;

    setSubmitting(true);
    try {
      const res = await api.post<SubmitAttemptResponse>("/api/attempts/submit", {
        question_id: question.id,
        session_id: Number(sessionId),
        selected_option: selected.originalKey,
        time_taken_secs: 90 - timer,
      });
      setResult(res.data);
      attemptedCountRef.current += 1;
      if (res.data.is_correct) correctCountRef.current += 1;
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    incrementQuestion();
    if (currentQuestionIndex + 1 >= totalQuestions) {
      await finishSession();
    } else {
      fetchQuestion();
    }
  };

  const timerColor =
    timer > 60 ? "text-emerald-400" : timer >= 30 ? "text-amber-400" : "text-red-400";
  const timerMins = Math.floor(timer / 60);
  const timerSecs = timer % 60;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator color="#06b6d4" size="large" />
      </SafeAreaView>
    );
  }

  if (paywallBlocked) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center px-6">
        <Text className="text-5xl mb-4">🔒</Text>
        <Text className="text-white text-2xl font-bold text-center mb-3">
          Premium Feature
        </Text>
        <Text className="text-slate-400 text-base text-center leading-6 mb-8">
          Topic-specific practice is available on the Pro plan.{"\n"}
          Upgrade to unlock all topics, quick practice, and full mock tests.
        </Text>
        <View className="w-full gap-3">
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/profile")}
            className="bg-blue-600 rounded-xl py-4 items-center"
            activeOpacity={0.8}
          >
            <Text className="text-white text-base font-semibold">Upgrade to Pro</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-slate-800 border border-slate-700 rounded-xl py-4 items-center"
            activeOpacity={0.8}
          >
            <Text className="text-slate-400 text-base font-semibold">Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (sessionSummary) {
    const wrongCount = sessionSummary.attemptedCount - sessionSummary.correctCount;
    const showSummaryCard = sessionSummary.attemptedCount > 0;

    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center px-6">
        <Text className="text-5xl mb-3">{allCaughtUp ? "🎉" : "✅"}</Text>
        <Text className="text-white text-2xl font-bold text-center mb-2">
          {allCaughtUp ? "You're all caught up!" : "Session Complete!"}
        </Text>
        {allCaughtUp && (
          <Text className="text-slate-400 text-sm text-center mb-5">
            You've completed all available questions for this topic.{"\n"}
            Check back soon for more.
          </Text>
        )}

        {/* Stats card — only if user answered at least 1 question */}
        {showSummaryCard && (
          <View className="w-full bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 mb-6 gap-4">
            <View className="flex-row justify-between items-center">
              <Text className="text-slate-400 text-sm">Correct</Text>
              <Text className="text-emerald-400 text-lg font-bold">
                {sessionSummary.correctCount}
              </Text>
            </View>
            <View className="h-px bg-slate-700/50" />
            <View className="flex-row justify-between items-center">
              <Text className="text-slate-400 text-sm">Wrong</Text>
              <Text className="text-red-400 text-lg font-bold">
                {wrongCount}
              </Text>
            </View>
            <View className="h-px bg-slate-700/50" />
            <View className="flex-row justify-between items-center">
              <Text className="text-slate-400 text-sm">XP Earned</Text>
              <Text className="text-cyan-400 text-lg font-bold">
                +{sessionSummary.xpEarned} XP
              </Text>
            </View>
            <View className="h-px bg-slate-700/50" />
            <View className="flex-row justify-between items-center">
              <Text className="text-slate-400 text-sm">Current Streak</Text>
              <Text className="text-amber-400 text-lg font-bold">
                🔥 {sessionSummary.streak} {sessionSummary.streak === 1 ? "day" : "days"}
              </Text>
            </View>
          </View>
        )}

        {/* Buttons */}
        <View className="w-full gap-3">
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/history")}
            className="bg-slate-800 border border-slate-700 rounded-xl py-4 items-center"
            activeOpacity={0.8}
          >
            <Text className="text-white text-base font-semibold">View History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)")}
            className="bg-blue-600 rounded-xl py-4 items-center"
            activeOpacity={0.8}
          >
            <Text className="text-white text-base font-semibold">Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (allCaughtUp) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center px-6">
        <Text className="text-5xl mb-4">🎉</Text>
        <Text className="text-white text-2xl font-bold text-center mb-3">
          You're all caught up!
        </Text>
        <Text className="text-slate-400 text-base text-center leading-6 mb-8">
          You've completed all available questions for this topic.{"\n"}
          Check back soon for more.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-blue-600 rounded-xl px-8 py-4"
          activeOpacity={0.8}
        >
          <Text className="text-white text-base font-semibold">Back to Practice</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!question) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator color="#06b6d4" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={["top"]}>
      {/* Top bar */}
      <View className="px-4 pt-2 pb-3">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-slate-400 text-sm">
            Q{currentQuestionIndex + 1}/{totalQuestions}
          </Text>
          <Text className={`text-lg font-bold ${timerColor}`}>
            {String(timerMins).padStart(2, "0")}:{String(timerSecs).padStart(2, "0")}
          </Text>
        </View>
        {/* Progress bar */}
        <View className="h-1 bg-slate-800 rounded-full overflow-hidden">
          <View
            className="h-full bg-cyan-500 rounded-full"
            style={{
              width: `${((currentQuestionIndex + (result ? 1 : 0)) / totalQuestions) * 100}%`,
            }}
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Topic & difficulty badges */}
        <View className="flex-row gap-2 mb-3">
          <View className="bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1">
            <Text className="text-slate-300 text-xs">{question.topic_name}</Text>
          </View>
          <View className="bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-1">
            <Text className="text-slate-300 text-xs capitalize">
              {question.difficulty}
            </Text>
          </View>
        </View>

        {/* Question card */}
        <View className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-4">
          <Text className="text-white text-base leading-6">
            {question.question_text}
          </Text>
          {question.statements.length > 0 && (
            <View className="mt-3 gap-2">
              {question.statements.map((stmt, i) => (
                <Text key={i} className="text-slate-300 text-sm leading-5">
                  {i + 1}. {stmt}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Options - 2 column grid */}
        <View className="flex-row flex-wrap gap-3 mb-4">
          {shuffledOptions.map((opt) => {
            let optStyle = "bg-slate-800/60 border-slate-700/50";
            let checkMark = "";

            if (result) {
              const originalSelected = shuffledOptions.find(
                (o) => o.displayKey === selectedDisplayKey
              );
              if (opt.originalKey === result.correct_option) {
                optStyle = "bg-emerald-500/20 border-emerald-500/50";
                checkMark = " ✓";
              } else if (
                originalSelected &&
                opt.originalKey === originalSelected.originalKey &&
                !result.is_correct
              ) {
                optStyle = "bg-red-500/20 border-red-500/50";
                checkMark = " ✗";
              } else {
                optStyle = "bg-slate-800/30 border-slate-700/30 opacity-50";
              }
            } else if (selectedDisplayKey === opt.displayKey) {
              optStyle = "bg-blue-600/20 border-blue-500/50";
            }

            return (
              <TouchableOpacity
                key={opt.displayKey}
                onPress={() => !result && setSelectedDisplayKey(opt.displayKey)}
                disabled={!!result}
                className={`border rounded-xl p-3 ${optStyle}`}
                style={{ width: "48%" }}
                activeOpacity={0.7}
              >
                <Text className="text-white text-sm">
                  <Text className="font-bold">{opt.displayKey}.</Text> {opt.text}
                  {checkMark}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Result banner */}
        {result && (
          <View
            className={`rounded-xl p-4 mb-4 border ${
              result.is_correct
                ? "bg-emerald-500/20 border-emerald-500/30"
                : "bg-red-500/20 border-red-500/30"
            }`}
          >
            <Text
              className={`text-lg font-bold mb-2 ${
                result.is_correct ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {result.is_correct ? "✅ Correct!" : "❌ Incorrect"}
            </Text>
            {result.rationale && (
              <Text className="text-slate-300 text-sm leading-5">
                {result.rationale}
              </Text>
            )}
            {result.source_label && (
              <View className="mt-3 bg-slate-800/60 rounded-lg p-3">
                <Text className="text-slate-400 text-xs">Source</Text>
                <Text className="text-slate-300 text-sm">{result.source_label}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View className="px-4 py-3 border-t border-slate-800">
        {!result ? (
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleNext}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl py-3 items-center"
            >
              <Text className="text-slate-400 text-sm font-semibold">Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!selectedDisplayKey || submitting}
              className={`flex-2 rounded-xl py-3 items-center px-8 ${
                selectedDisplayKey ? "bg-blue-600" : "bg-slate-700 opacity-50"
              }`}
              activeOpacity={0.8}
            >
              <Text className="text-white text-sm font-semibold">
                {submitting ? "Submitting..." : "Submit"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleNext}
            className="bg-blue-600 rounded-xl py-4 items-center"
            activeOpacity={0.8}
          >
            <Text className="text-white text-base font-semibold">
              Next Question →
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
