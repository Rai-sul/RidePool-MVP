import { UserProfile } from './profile.model';
import { docstore } from './docstore';
import { v4 as uuidv4 } from 'uuid';

const COLLECTION_NAME = 'userProfiles';

export const createUserProfile = async (profile: UserProfile): Promise<UserProfile> => {
  const newProfile = { ...profile, id: profile.id || uuidv4(), uniqueId: Math.random().toString(36).substring(2, 10).toUpperCase(), friends: [] };
  await docstore.add(COLLECTION_NAME, newProfile);
  return newProfile;
};

export const getUserProfile = async (id: string): Promise<UserProfile | undefined> => {
  return await docstore.get(COLLECTION_NAME, id) as UserProfile | undefined;
};

export const getUserByUniqueId = async (uniqueId: string): Promise<UserProfile | undefined> => {
  const results = await docstore.query(COLLECTION_NAME, { uniqueId });
  return results[0] as UserProfile | undefined;
};

export const addFriend = async (userId: string, friendUniqueId: string): Promise<UserProfile | undefined> => {
  const user = await getUserProfile(userId);
  const friend = await getUserByUniqueId(friendUniqueId);

  if (user && friend && user.id !== friend.id) {
    if (!user.friends.includes(friend.uniqueId)) {
      user.friends.push(friend.uniqueId);
      await docstore.set(COLLECTION_NAME, user.id, { friends: user.friends });
    }
    // Optional: add user to friend's friend list as well
    if (!friend.friends.includes(user.uniqueId)) {
      friend.friends.push(user.uniqueId);
      await docstore.set(COLLECTION_NAME, friend.id, { friends: friend.friends });
    }
    return user;
  }
  return undefined;
};