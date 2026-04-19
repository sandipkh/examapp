import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

const EXAM_OPTIONS = [
  { label: "UPSC CSE 2025", value: "UPSC CSE 2025" },
  { label: "UPSC CSE 2026", value: "UPSC CSE 2026" },
  { label: "UPSC CSE 2027", value: "UPSC CSE 2027" },
];

export default function ProfileSetupScreen() {
  const router = useRouter();
  const updateUser = useAuthStore((s) => s.updateUser);
  const setNeedsProfileSetup = useAuthStore((s) => s.setNeedsProfileSetup);
  const [name, setName] = useState("");
  const [targetExam, setTargetExam] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await api.put("/api/auth/profile", {
        name: name.trim(),
        target_exam: targetExam || null,
      });
      updateUser(res.data);
      setNeedsProfileSetup(false);
      router.replace("/(tabs)");
    } catch (err) {
      console.error("Profile update error:", err);
    } finally {
      setLoading(false);
    }
  };

  const isValid = name.trim().length > 0;

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="items-center mb-8">
        <Text className="text-5xl mb-4">🎯</Text>
        <Text className="text-white text-2xl font-bold mb-2">
          Almost there!
        </Text>
        <Text className="text-slate-400 text-base text-center">
          Tell us about yourself to personalize your experience
        </Text>
      </View>

      {/* Name input */}
      <Text className="text-slate-300 text-sm font-semibold mb-2 ml-1">
        Your Name
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Enter your full name"
        placeholderTextColor="#64748b"
        className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-4 text-white text-base mb-6"
        autoFocus
      />

      {/* Target exam */}
      <Text className="text-slate-300 text-sm font-semibold mb-3 ml-1">
        Target Exam
      </Text>
      <View className="gap-3 mb-8">
        {EXAM_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setTargetExam(opt.value)}
            className={`border rounded-xl px-4 py-4 flex-row items-center ${
              targetExam === opt.value
                ? "bg-blue-600/20 border-blue-500/50"
                : "bg-slate-800/60 border-slate-700/50"
            }`}
            activeOpacity={0.7}
          >
            <View
              className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                targetExam === opt.value
                  ? "border-blue-500"
                  : "border-slate-600"
              }`}
            >
              {targetExam === opt.value && (
                <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              )}
            </View>
            <Text className="text-white text-base font-medium">
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Submit */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={!isValid || loading}
        className={`rounded-xl py-4 items-center ${
          isValid ? "bg-blue-600" : "bg-slate-700 opacity-50"
        }`}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-white text-base font-semibold">
            Start My Prep Journey →
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
