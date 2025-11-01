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
const authService = __importStar(require("./auth.service"));
const PROTO_PATH = __dirname + '../../../proto/auth.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const authProto = grpc.loadPackageDefinition(packageDefinition).auth;
function getServer() {
    const server = new grpc.Server();
    server.addService(authProto.AuthService.service, {
        Register: (call, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const newUser = yield authService.register(call.request.email, call.request.password);
                callback(null, { user: newUser });
            }
            catch (error) {
                console.error('Error in Register:', error);
                callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
            }
        }),
        Login: (call, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const loggedInUser = yield authService.login(call.request.email, call.request.password);
                if (loggedInUser) {
                    callback(null, { user: loggedInUser });
                }
                else {
                    callback({ code: grpc.status.UNAUTHENTICATED, message: 'Invalid credentials' });
                }
            }
            catch (error) {
                console.error('Error in Login:', error);
                callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
            }
        }),
    });
    return server;
}
function serve() {
    const server = getServer();
    server.bindAsync('0.0.0.0:50052', grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error(`Error starting gRPC server: ${err.message}`);
            return;
        }
        console.log(`gRPC Auth service listening on port ${port}`);
        server.start();
    });
}
serve();
