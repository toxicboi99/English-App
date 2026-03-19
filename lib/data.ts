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
