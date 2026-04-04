export type LearningLevel =
  | "BEGINNER"
  | "INTERMEDIATE"
  | "ADVANCED"
  | "FLUENT";

export type AppScreenKey =
  | "dashboard"
  | "feed"
  | "practice"
  | "studio"
  | "friends"
  | "dictionary"
  | "rooms";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  bio: string | null;
  level: LearningLevel;
  role: "USER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  oauthAccounts: Array<{ provider: string }>;
};

export type AuthResponse = {
  token: string;
  user: SessionUser;
};

export type DashboardData = {
  postsCount: number;
  wordsCount: number;
  pendingFriends: number;
  activeRooms: number;
  latestPosts: Array<{
    id: string;
    title: string;
    learningLevel: LearningLevel;
    createdAt: string;
    likes: Array<{ id: string }>;
    comments: Array<{ id: string }>;
  }>;
};

export type RecordingPrompt = {
  id: string;
  title: string;
  description: string | null;
  script: string;
  level: LearningLevel;
};

export type StudioData = {
  canUpload: boolean;
  prompts: RecordingPrompt[];
};

export type UploadResponse = {
  videoId: string;
  url: string;
  embedUrl: string;
};

export type GrammarFeedback = {
  correctedText: string;
  explanation: string;
};

export type SpeakingFeedback = {
  score: number;
  matchedWords: number;
  totalWords: number;
  missingWords: string[];
  extraWords: string[];
  feedback: string;
};

export type FeedPost = {
  id: string;
  title: string;
  description: string;
  script: string | null;
  learningLevel: LearningLevel;
  youtubeVideoId: string | null;
  youtubeUrl: string | null;
  localVideoUrl: string | null;
  thumbnailUrl: string | null;
  isVerified: boolean;
  createdAt: string;
  likedByMe: boolean;
  author: {
    id: string;
    name: string;
    profileImage: string | null;
    level: LearningLevel;
  };
  likes: Array<{ id: string; userId: string }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      profileImage: string | null;
    };
  }>;
};

export type FeedResponse = {
  posts: FeedPost[];
};

export type UserCard = {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
  level: LearningLevel;
};

export type FriendRequestCard = {
  id: string;
  sender?: UserCard;
  receiver?: UserCard;
};

export type FriendsResponse = {
  friends: UserCard[];
  incoming: FriendRequestCard[];
  outgoing: FriendRequestCard[];
  suggestions: UserCard[];
};

export type DictionaryWord = {
  id: string;
  word: string;
  definition: string;
  partOfSpeech: string | null;
  phonetic: string | null;
  exampleSentence: string | null;
  level: LearningLevel;
  userWords: Array<{ id: string; mastered: boolean; notes: string | null }>;
};

export type SavedWord = {
  id: string;
  notes: string | null;
  mastered: boolean;
  dictionaryWord: {
    id: string;
    word: string;
    definition: string;
    exampleSentence: string | null;
    level: LearningLevel;
  };
};

export type DictionaryResponse = {
  words: DictionaryWord[];
  savedWords: SavedWord[];
};

export type Room = {
  id: string;
  name: string;
  slug: string;
  topic: string | null;
  provider: "WEBRTC" | "LIVEKIT" | "HMS";
  status: "WAITING" | "LIVE" | "ENDED";
  maxParticipants: number;
  joinedByMe: boolean;
  host: {
    id: string;
    name: string;
    profileImage: string | null;
  };
  participants: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      name: string;
      profileImage: string | null;
    };
  }>;
};

export type RoomsResponse = {
  rooms: Room[];
};
