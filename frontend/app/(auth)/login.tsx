import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { signInWithGoogle, sendOtp } from "../../lib/firebase";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";
import type { AuthResponse } from "../../types";

const { width, height } = Dimensions.get("window");

function FloatingOrb({
  size,
  color,
  startX,
  startY,
}: {
  size: number;
  color: string;
  startX: number;
  startY: number;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateAxis = (anim: Animated.Value, range: number) => {
      const loop = () => {
        Animated.sequence([
          Animated.timing(anim, {
            toValue: Math.random() * range - range / 2,
            duration: 4000 + Math.random() * 3000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: Math.random() * range - range / 2,
            duration: 4000 + Math.random() * 3000,
            useNativeDriver: true,
          }),
        ]).start(loop);
      };
      loop();
    };
    animateAxis(translateX, 60);
    animateAxis(translateY, 60);
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: startX,
        top: startY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: 0.15,
        transform: [{ translateX }, { translateY }],
      }}
    />
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setNeedsProfileSetup = useAuthStore((s) => s.setNeedsProfileSetup);
  const [loading, setLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phone, setPhone] = useState("");

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Opens Google OAuth browser, signs into Firebase, returns Firebase ID token
      const firebaseIdToken = await signInWithGoogle();
      // Send Firebase ID token to backend
      const res = await api.post<AuthResponse>(
        "/api/auth/verify-firebase-token",
        { id_token: firebaseIdToken }
      );
      if (res.data.is_new_user) {
        setNeedsProfileSetup(true);
      }
      setAuth(res.data.user, res.data.access_token, res.data.refresh_token);
      if (res.data.is_new_user) {
        router.push("/(auth)/profile-setup");
      } else {
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.error("Google auth error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) return;
    setPhoneLoading(true);
    try {
      const verificationId = await sendOtp(`+91${phone}`);
      router.push({
        pathname: "/(auth)/otp",
        params: { phone, verificationId },
      });
    } catch (err) {
      console.error("Send OTP error:", err);
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      {/* Floating gradient orbs */}
      <FloatingOrb size={200} color="#2563eb" startX={-50} startY={100} />
      <FloatingOrb size={160} color="#06b6d4" startX={width - 100} startY={300} />
      <FloatingOrb size={180} color="#7c3aed" startX={width / 2 - 90} startY={height - 300} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo & Title */}
        <View className="items-center mb-8">
          <Text className="text-5xl mb-4">📚</Text>
          <Text className="text-white text-3xl font-bold mb-2">
            UPSC IAS Prep
          </Text>
          <Text className="text-slate-400 text-base text-center">
            Your intelligent companion for civil services preparation
          </Text>
        </View>

        {/* Social proof */}
        <View className="items-center mb-10">
          <View className="bg-slate-800/60 border border-slate-700/50 rounded-full px-4 py-2">
            <Text className="text-slate-300 text-sm">
              12,000+ aspirants preparing
            </Text>
          </View>
        </View>

        {/* Google button */}
        <TouchableOpacity
          onPress={handleGoogleLogin}
          disabled={loading}
          className="bg-white rounded-xl py-4 px-6 flex-row items-center justify-center mb-3"
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#020617" />
          ) : (
            <>
              <Text className="text-lg mr-3">G</Text>
              <Text className="text-slate-900 text-base font-semibold">
                Continue with Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Facebook — disabled */}
        <TouchableOpacity
          disabled
          className="bg-slate-800/60 border border-slate-700/50 rounded-xl py-4 px-6 flex-row items-center justify-center mb-6 opacity-50"
        >
          <Text className="text-blue-400 text-lg mr-3">f</Text>
          <Text className="text-slate-400 text-base font-semibold">
            Continue with Facebook
          </Text>
          <View className="bg-slate-700 rounded-full px-2 py-0.5 ml-2">
            <Text className="text-slate-400 text-xs">Coming soon</Text>
          </View>
        </TouchableOpacity>

        {/* Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-slate-700" />
          <Text className="text-slate-500 mx-4 text-sm">
            or continue with mobile
          </Text>
          <View className="flex-1 h-px bg-slate-700" />
        </View>

        {/* Phone input */}
        <View>
          <View className="flex-row mb-3">
            <View className="bg-slate-800/60 border border-slate-700/50 rounded-l-xl px-4 py-4 justify-center">
              <Text className="text-white text-base">+91</Text>
            </View>
            <TextInput
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ""))}
              placeholder="Enter mobile number"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              maxLength={10}
              className="flex-1 bg-slate-800/60 border border-l-0 border-slate-700/50 rounded-r-xl px-4 py-4 text-white text-base"
            />
          </View>
          <TouchableOpacity
            onPress={handleSendOtp}
            disabled={phone.length !== 10 || phoneLoading}
            className={`rounded-xl py-3 items-center mb-4 ${
              phone.length === 10 ? "bg-blue-600" : "bg-slate-700 opacity-50"
            }`}
            activeOpacity={0.8}
          >
            <Text className="text-white text-sm font-semibold">
              {phoneLoading ? "Sending OTP..." : "Send OTP"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <Text className="text-slate-500 text-xs text-center mt-6 leading-5">
          By continuing, you agree to our Terms of Service{"\n"}and Privacy
          Policy
        </Text>
      </ScrollView>
    </View>
  );
}
