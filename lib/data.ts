import { getEffectiveUserRole } from "@/lib/auth";
import { defaultRecordingPrompts } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function getDashboardData(userId: string) {
  const [postsCount, wordsCount, pendingFriends, activeRooms, latestPosts] =
    await prisma.$transaction([
      prisma.post.count({
        where: { authorId: userId },
      }),
      prisma.userWord.count({
        where: { userId },
      }),
      prisma.friendRequest.count({
        where: {
          receiverId: userId,
          status: "PENDING",
        },
      }),
      prisma.roomParticipant.count({
        where: {
          userId,
          room: {
            status: {
              in: ["WAITING", "LIVE"],
            },
          },
        },
      }),
      prisma.post.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          title: true,
          learningLevel: true,
          createdAt: true,
          likes: {
            select: { id: true },
          },
          comments: {
            select: { id: true },
          },
        },
      }),
    ]);

  return {
    postsCount,
    wordsCount,
    pendingFriends,
    activeRooms,
    latestPosts,
  };
}

export async function getFeedPosts(userId: string) {
  const posts = await prisma.post.findMany({
    where: {
      visibility: "VISIBLE",
    },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          profileImage: true,
          level: true,
        },
      },
      likes: {
        select: {
          id: true,
          userId: true,
        },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  return posts.map((post) => ({
    ...post,
    likedByMe: post.likes.some((like) => like.userId === userId),
  }));
}

export async function getRecordingPrompts(includeInactive = false) {
  const prompts = await prisma.recordingPrompt.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  if (prompts.length) {
    return prompts;
  }

  return defaultRecordingPrompts.map((prompt, index) => ({
    id: `default-${index}`,
    title: prompt.title,
    description: prompt.description,
    script: prompt.script,
    level: prompt.level,
    isActive: true,
    sortOrder: index,
    createdById: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  }));
}

export async function getFriendsData(userId: string) {
  const [directFriends, reverseFriends, incoming, outgoing, suggestions] =
    await prisma.$transaction([
      prisma.friendship.findMany({
        where: { userId },
        include: {
          friend: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
              level: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.friendship.findMany({
        where: { friendId: userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
              level: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.friendRequest.findMany({
        where: {
          receiverId: userId,
          status: "PENDING",
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
              level: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.friendRequest.findMany({
        where: {
          senderId: userId,
          status: "PENDING",
        },
        include: {
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
              profileImage: true,
              level: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: {
          NOT: {
            id: userId,
          },
        },
        take: 8,
        select: {
          id: true,
          name: true,
          email: true,
          profileImage: true,
          level: true,
        },
      }),
    ]);

  const friendIds = new Set<string>();
  for (const item of directFriends) {
    friendIds.add(item.friend.id);
  }
  for (const item of reverseFriends) {
    friendIds.add(item.user.id);
  }

  const pendingIds = new Set<string>();
  for (const item of incoming) {
    pendingIds.add(item.sender.id);
  }
  for (const item of outgoing) {
    pendingIds.add(item.receiver.id);
  }

  return {
    friends: [
      ...directFriends.map((item) => item.friend),
      ...reverseFriends.map((item) => item.user),
    ],
    incoming,
    outgoing,
    suggestions: suggestions.filter(
      (candidate) => !friendIds.has(candidate.id) && !pendingIds.has(candidate.id),
    ),
  };
}

export async function getDictionaryData(userId: string, search = "") {
  const words = await prisma.dictionaryWord.findMany({
    where: search
      ? {
          OR: [
            {
              word: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              definition: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : undefined,
    take: 20,
    orderBy: { word: "asc" },
    include: {
      userWords: {
        where: { userId },
        select: {
          id: true,
          notes: true,
          mastered: true,
        },
      },
    },
  });

  const savedWords = await prisma.userWord.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      dictionaryWord: true,
    },
  });

  return {
    words,
    savedWords,
  };
}

export async function getRoomsData(userId: string) {
  const rooms = await prisma.room.findMany({
    orderBy: { createdAt: "desc" },
    take: 12,
    include: {
      host: {
        select: {
          id: true,
          name: true,
          profileImage: true,
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  return rooms.map((room) => ({
    ...room,
    joinedByMe: room.participants.some((participant) => participant.userId === userId),
  }));
}

export async function getAdminDashboardData() {
  const [
    prompts,
    users,
    posts,
    promptCount,
    userCount,
    activeUserCount,
    hiddenPostCount,
    verifiedPostCount,
  ] =
    await prisma.$transaction([
      prisma.recordingPrompt.findMany({
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          name: true,
          email: true,
          level: true,
          role: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              posts: true,
              userWords: true,
            },
          },
        },
      }),
      prisma.post.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          description: true,
          learningLevel: true,
          youtubeVideoId: true,
          youtubeUrl: true,
          videoStatus: true,
          isVerified: true,
          visibility: true,
          moderationNotes: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              level: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      }),
      prisma.recordingPrompt.count(),
      prisma.user.count(),
      prisma.user.count({
        where: { isActive: true },
      }),
      prisma.post.count({
        where: { visibility: "HIDDEN" },
      }),
      prisma.post.count({
        where: { isVerified: true },
      }),
    ]);

  return {
    stats: {
      promptCount,
      userCount,
      activeUserCount,
      hiddenPostCount,
      verifiedPostCount,
    },
    prompts,
    users: users.map((user) => ({
      ...user,
      role: getEffectiveUserRole(user.email, user.role),
      postsCount: user._count.posts,
      savedWordsCount: user._count.userWords,
    })),
    posts: posts.map((post) => ({
      ...post,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
    })),
  };
}
