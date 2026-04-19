import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import type { PaginatedAttempts, AttemptHistoryItem } from "../../types";

type FilterType = "all" | "correct" | "incorrect" | "bookmarked";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "correct", label: "Correct" },
  { key: "incorrect", label: "Incorrect" },
  { key: "bookmarked", label: "Bookmarked" },
];

function AttemptRow({
  item,
  onBookmarkToggled,
}: {
  item: AttemptHistoryItem;
  onBookmarkToggled: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [bookmarked, setBookmarked] = useState(item.bookmarked);

  const toggleBookmark = async () => {
    const previous = bookmarked;
    setBookmarked(!previous); // optimistic
    try {
      const res = await api.post(`/api/attempts/bookmarks/${item.question.id}`);
      setBookmarked(res.data.bookmarked);
      onBookmarkToggled();
    } catch (err) {
      setBookmarked(previous); // rollback
      console.error("Bookmark error:", err);
    }
  };

  return (
    <TouchableOpacity
      onPress={() => setExpanded(!expanded)}
      className="bg-slate-800/60 border border-slate-700/50 rounded-xl mb-3 overflow-hidden"
      activeOpacity={0.8}
    >
      {/* Collapsed row */}
      <View className="flex-row items-center p-4">
        <View
          className={`w-2.5 h-2.5 rounded-full mr-3 ${
            item.is_correct ? "bg-emerald-500" : "bg-red-500"
          }`}
        />
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1">
            <View className="bg-slate-700/60 rounded-full px-2 py-0.5">
              <Text className="text-slate-300 text-xs">
                {item.question.topic_name}
              </Text>
            </View>
          </View>
          <Text className="text-white text-sm" numberOfLines={2}>
            {item.question.question_text}
          </Text>
          <Text className="text-slate-500 text-xs mt-1">
            Your answer: {item.selected_option}
          </Text>
        </View>
        <Text className="text-slate-500 text-lg ml-2">
          {expanded ? "▲" : "▼"}
        </Text>
      </View>

      {/* Expanded content */}
      {expanded && (
        <View className="px-4 pb-4 border-t border-slate-700/30 pt-3">
          <Text className="text-white text-sm mb-3 leading-5">
            {item.question.question_text}
          </Text>

          {item.question.statements.length > 0 && (
            <View className="mb-3 gap-1">
              {item.question.statements.map((s, i) => (
                <Text key={i} className="text-slate-300 text-xs">
                  {i + 1}. {s}
                </Text>
              ))}
            </View>
          )}

          <View className="flex-row gap-2 mb-3">
            <View
              className={`rounded-lg px-3 py-1 ${
                item.is_correct ? "bg-emerald-500/20" : "bg-red-500/20"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  item.is_correct ? "text-emerald-400" : "text-red-400"
                }`}
              >
                You: {item.selected_option}
              </Text>
            </View>
            <View className="bg-emerald-500/20 rounded-lg px-3 py-1">
              <Text className="text-emerald-400 text-xs font-semibold">
                Correct: {item.question.correct_option}
              </Text>
            </View>
          </View>

          {item.question.rationale && (
            <View className="bg-slate-700/40 rounded-lg p-3 mb-3">
              <Text className="text-slate-300 text-xs leading-4">
                {item.question.rationale}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={toggleBookmark}
            className={`self-start rounded-full px-3 py-1.5 border ${
              bookmarked
                ? "bg-amber-500/20 border-amber-500/30"
                : "bg-slate-700/40 border-slate-600/30"
            }`}
          >
            <Text className={bookmarked ? "text-amber-400 text-xs" : "text-slate-400 text-xs"}>
              {bookmarked ? "★ Bookmarked" : "☆ Bookmark"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchDebounced(text);
    }, 300);
  }, []);

  const handleBookmarkToggled = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["history"] });
  }, [queryClient]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<PaginatedAttempts>({
    queryKey: ["history", filter, searchDebounced],
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string | number> = {
        page: pageParam as number,
        limit: 20,
        filter,
      };
      const res = await api.get("/api/attempts/history", { params });
      return res.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.has_more ? (lastPageParam as number) + 1 : undefined,
  });

  const attempts = data?.pages.flatMap((p) => p.attempts) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-slate-950" edges={["top"]}>
      <View className="px-4 pt-4 pb-2">
        <Text className="text-white text-xl font-bold mb-4">History</Text>

        {/* Search */}
        <TextInput
          value={search}
          onChangeText={handleSearch}
          placeholder="Search questions..."
          placeholderTextColor="#64748b"
          className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-sm mb-3"
        />

        {/* Filter tabs */}
        <View className="flex-row gap-2 mb-2">
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 ${
                filter === f.key
                  ? "bg-blue-600"
                  : "bg-slate-800/60 border border-slate-700/50"
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  filter === f.key ? "text-white" : "text-slate-400"
                }`}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#06b6d4" className="mt-8" />
      ) : (
        <FlatList
          data={attempts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <AttemptRow item={item} onBookmarkToggled={handleBookmarkToggled} />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color="#06b6d4" className="my-4" />
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center mt-12">
              <Text className="text-slate-500 text-base">No attempts yet</Text>
              <Text className="text-slate-600 text-sm mt-1">
                Start a test to see your history here
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
