export interface UserProfile {
  id: string;
  uniqueId: string; // 8-character unique ID
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profilePicture: string;
  gender: string;
  friends: string[]; // Array of uniqueIds of friends
}

export interface DriverProfile extends UserProfile {
  licensePlate: string;
  carModel: string;
  rating: number;
}
