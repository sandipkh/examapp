import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { confirmOtp, sendOtp } from "../../lib/firebase";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import type { AuthResponse } from "../../types";

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { phone, verificationId } = useLocalSearchParams<{
    phone: string;
    verificationId: string;
  }>();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [currentVerificationId, setCurrentVerificationId] = useState(
    verificationId ?? ""
  );
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    setError("");
    const newDigits = [...digits];
    newDigits[index] = text.slice(-1);
    setDigits(newDigits);

    if (text && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newDigits = [...digits];
      newDigits[index - 1] = "";
      setDigits(newDigits);
    }
  };

  const handleVerify = async () => {
    const otp = digits.join("");
    if (otp.length !== OTP_LENGTH || !currentVerificationId) return;

    setLoading(true);
    setError("");
    try {
      const idToken = await confirmOtp(currentVerificationId, otp);
      const res = await api.post<AuthResponse>(
        "/api/auth/verify-firebase-token",
        { id_token: idToken }
      );
      setAuth(res.data.user, res.data.access_token, res.data.refresh_token);
      if (res.data.is_new_user) {
        router.push("/(auth)/profile-setup");
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      const msg =
        err?.code === "auth/invalid-verification-code"
          ? "Invalid OTP. Please try again."
          : "Verification failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!phone) return;
    setResending(true);
    setError("");
    try {
      const newId = await sendOtp(`+91${phone}`);
      setCurrentVerificationId(newId);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const isFilled = digits.every((d) => d.length === 1);

  return (
    <View className="flex-1 bg-slate-950 px-6 justify-center">
      <View className="items-center mb-8">
        <Text className="text-4xl mb-4">🔐</Text>
        <Text className="text-white text-2xl font-bold mb-2">
          Verify your number
        </Text>
        <Text className="text-slate-400 text-base text-center">
          Enter the 6-digit code sent to{"\n"}
          {phone ? `+91 ${phone}` : "your phone"}
        </Text>
      </View>

      {/* OTP boxes */}
      <View className="flex-row justify-center gap-3 mb-6">
        {digits.map((digit, i) => (
          <TextInput
            key={i}
            ref={(ref) => {
              inputRefs.current[i] = ref;
            }}
            value={digit}
            onChangeText={(text) => handleChange(text, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            className={`w-12 h-14 rounded-xl text-center text-white text-xl font-bold border ${
              digit
                ? "bg-slate-800/80 border-cyan-500"
                : "bg-slate-800/60 border-slate-700/50"
            }`}
            selectionColor="#06b6d4"
          />
        ))}
      </View>

      {/* Error message */}
      {error ? (
        <View className="items-center mb-4">
          <View className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3">
            <Text className="text-red-400 text-sm text-center">{error}</Text>
          </View>
        </View>
      ) : null}

      {/* Verify button */}
      <TouchableOpacity
        onPress={handleVerify}
        disabled={!isFilled || loading}
        className={`rounded-xl py-4 items-center ${
          isFilled ? "bg-cyan-500" : "bg-slate-700 opacity-50"
        }`}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-white text-base font-semibold">Verify OTP</Text>
        )}
      </TouchableOpacity>

      {/* Resend */}
      <TouchableOpacity
        onPress={handleResend}
        disabled={resending}
        className="mt-6 items-center"
      >
        <Text className="text-slate-500 text-sm">
          Didn't receive code?{" "}
          <Text className="text-cyan-500 font-semibold">
            {resending ? "Sending..." : "Resend"}
          </Text>
        </Text>
      </TouchableOpacity>

      {/* Back */}
      <TouchableOpacity
        onPress={() => router.back()}
        className="mt-4 items-center"
      >
        <Text className="text-slate-400 text-sm">Back to login</Text>
      </TouchableOpacity>
    </View>
  );
}
