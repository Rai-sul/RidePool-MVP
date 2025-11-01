"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const profileService = __importStar(require("./profile.service"));
const PROTO_PATH = __dirname + '../../../proto/profile.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const profileProto = grpc.loadPackageDefinition(packageDefinition).profile;
function getServer() {
    const server = new grpc.Server();
    server.addService(profileProto.ProfileService.service, {
        CreateUserProfile: (call, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const reqProfile = call.request.profile;
                const userProfile = yield profileService.createUserProfile({
                    id: reqProfile.id,
                    uniqueId: reqProfile.unique_id,
                    name: reqProfile.name,
                    email: reqProfile.email,
                    phoneNumber: reqProfile.phone_number,
                    avatarUrl: reqProfile.avatar_url,
                    friends: reqProfile.friends,
                });
                callback(null, { profile: userProfile });
            }
            catch (error) {
                console.error('Error in CreateUserProfile:', error);
                callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
            }
        }),
        GetUserProfile: (call, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userProfile = yield profileService.getUserProfile(call.request.id);
                if (userProfile) {
                    callback(null, { profile: userProfile });
                }
                else {
                    callback({ code: grpc.status.NOT_FOUND, message: 'Profile not found' });
                }
            }
            catch (error) {
                console.error('Error in GetUserProfile:', error);
                callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
            }
        }),
        GetUserByUniqueId: (call, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const userProfile = yield profileService.getUserByUniqueId(call.request.unique_id);
                if (userProfile) {
                    callback(null, { profile: userProfile });
                }
                else {
                    callback({ code: grpc.status.NOT_FOUND, message: 'Profile not found' });
                }
            }
            catch (error) {
                console.error('Error in GetUserByUniqueId:', error);
                callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
            }
        }),
        AddFriend: (call, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const updatedUser = yield profileService.addFriend(call.request.user_id, call.request.friend_unique_id);
                if (updatedUser) {
                    callback(null, { profile: updatedUser });
                }
                else {
                    callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Could not add friend' });
                }
            }
            catch (error) {
                console.error('Error in AddFriend:', error);
                callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
            }
        }),
    });
    return server;
}
function serve() {
    const server = getServer();
    server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error(`Error starting gRPC server: ${err.message}`);
            return;
        }
        console.log(`gRPC Profile service listening on port ${port}`);
        server.start();
    });
}
serve();
