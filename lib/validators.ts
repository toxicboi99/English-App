import { z } from "zod";

import {
  learningLevels,
  postVisibilities,
  roomProviders,
  userRoles,
} from "@/lib/constants";

const imageSchema = z
  .string()
  .url()
  .or(z.literal(""))
  .optional()
  .transform((value) => (value ? value : undefined));

export const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.email(),
  password: z.string().min(8).max(128),
  profileImage: imageSchema,
  bio: z.string().max(280).optional(),
  level: z.enum(learningLevels).optional().default("BEGINNER"),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const postSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(1500),
  script: z.string().max(5000).optional(),
  learningLevel: z.enum(learningLevels),
  youtubeVideoId: z.string().max(120).optional(),
  youtubeUrl: z.string().url().optional(),
  localVideoUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  videoStatus: z.enum(["DRAFT", "PROCESSING", "UPLOADED", "FAILED"]).optional(),
});

export const commentSchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(1).max(400),
});

export const likeSchema = z.object({
  postId: z.string().min(1),
});

export const friendActionSchema = z.object({
  action: z.enum(["send", "accept", "decline", "cancel"]),
  userId: z.string().optional(),
  requestId: z.string().optional(),
});

export const dictionarySearchSchema = z.object({
  q: z.string().max(60).optional().default(""),
});

export const saveWordSchema = z.object({
  action: z.literal("save"),
  dictionaryWordId: z.string().min(1),
  notes: z.string().max(240).optional(),
});

export const createDictionaryWordSchema = z.object({
  action: z.literal("create"),
  word: z.string().trim().min(1).max(80),
  definition: z.string().trim().min(3).max(1500),
  partOfSpeech: z.string().trim().max(80).optional(),
  phonetic: z.string().trim().max(80).optional(),
  exampleSentence: z.string().trim().max(500).optional(),
  level: z.enum(learningLevels).optional().default("BEGINNER"),
  notes: z.string().max(240).optional(),
});

export const dictionaryMutationSchema = z.discriminatedUnion("action", [
  saveWordSchema,
  createDictionaryWordSchema,
]);

export const adminCreatePromptSchema = z.object({
  action: z.literal("createPrompt"),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(400).optional(),
  script: z.string().trim().min(20).max(5000),
  level: z.enum(learningLevels).optional().default("BEGINNER"),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(999).optional().default(0),
});

export const adminUpdatePromptSchema = z.object({
  action: z.literal("updatePrompt"),
  promptId: z.string().min(1),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(400).optional(),
  script: z.string().trim().min(20).max(5000),
  level: z.enum(learningLevels),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

export const adminUpdateUserSchema = z.object({
  action: z.literal("updateUser"),
  userId: z.string().min(1),
  level: z.enum(learningLevels),
  role: z.enum(userRoles),
  isActive: z.boolean(),
});

export const adminUpdatePostSchema = z.object({
  action: z.literal("updatePost"),
  postId: z.string().min(1),
  isVerified: z.boolean(),
  visibility: z.enum(postVisibilities),
  moderationNotes: z.string().trim().max(500).optional(),
});

export const adminMutationSchema = z.discriminatedUnion("action", [
  adminCreatePromptSchema,
  adminUpdatePromptSchema,
  adminUpdateUserSchema,
  adminUpdatePostSchema,
]);

export const roomSchema = z.object({
  action: z.enum(["create", "join", "leave"]),
  roomId: z.string().optional(),
  name: z.string().min(3).max(80).optional(),
  topic: z.string().max(280).optional(),
  maxParticipants: z.number().int().min(2).max(4).optional(),
  provider: z.enum(roomProviders).optional().default("WEBRTC"),
});

export const speakingFeedbackSchema = z.object({
  targetText: z.string().min(2).max(500),
  spokenText: z.string().min(1).max(500),
});

export const grammarSchema = z.object({
  text: z.string().min(2).max(600),
});
