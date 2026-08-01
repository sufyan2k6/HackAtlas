export type UserRole = "user" | "admin" | "moderator";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  github?: string;
  linkedin?: string;
  website?: string;
  skills?: string[];
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserBookmark {
  id: string;
  userId: string;
  hackathonId: string;
  createdAt: string;
}

export interface UserNotificationPreferences {
  emailDigest: boolean;
  newHackathons: boolean;
  deadlineReminders: boolean;
  upcomingEvents: boolean;
}

export interface AuthSession {
  user: UserProfile;
  expires: string;
  accessToken?: string;
}

// Stub: replace with actual NextAuth session when auth is implemented
export type Session = AuthSession | null;
