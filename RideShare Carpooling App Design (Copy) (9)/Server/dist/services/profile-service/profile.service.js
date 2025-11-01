"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFriend = exports.getUserByUniqueId = exports.getUserProfile = exports.createUserProfile = void 0;
const docstore_1 = require("./docstore");
const uuid_1 = require("uuid");
const COLLECTION_NAME = 'userProfiles';
const createUserProfile = (profile) => __awaiter(void 0, void 0, void 0, function* () {
    const newProfile = Object.assign(Object.assign({}, profile), { id: profile.id || (0, uuid_1.v4)(), uniqueId: Math.random().toString(36).substring(2, 10).toUpperCase(), friends: [] });
    yield docstore_1.docstore.add(COLLECTION_NAME, newProfile);
    return newProfile;
});
exports.createUserProfile = createUserProfile;
const getUserProfile = (id) => __awaiter(void 0, void 0, void 0, function* () {
    return yield docstore_1.docstore.get(COLLECTION_NAME, id);
});
exports.getUserProfile = getUserProfile;
const getUserByUniqueId = (uniqueId) => __awaiter(void 0, void 0, void 0, function* () {
    const results = yield docstore_1.docstore.query(COLLECTION_NAME, { uniqueId });
    return results[0];
});
exports.getUserByUniqueId = getUserByUniqueId;
const addFriend = (userId, friendUniqueId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield (0, exports.getUserProfile)(userId);
    const friend = yield (0, exports.getUserByUniqueId)(friendUniqueId);
    if (user && friend && user.id !== friend.id) {
        if (!user.friends.includes(friend.uniqueId)) {
            user.friends.push(friend.uniqueId);
            yield docstore_1.docstore.set(COLLECTION_NAME, user.id, { friends: user.friends });
        }
        // Optional: add user to friend's friend list as well
        if (!friend.friends.includes(user.uniqueId)) {
            friend.friends.push(user.uniqueId);
            yield docstore_1.docstore.set(COLLECTION_NAME, friend.id, { friends: friend.friends });
        }
        return user;
    }
    return undefined;
});
exports.addFriend = addFriend;
