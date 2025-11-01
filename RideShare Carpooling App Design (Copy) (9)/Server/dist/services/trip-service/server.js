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
const tripService = __importStar(require("./trip.service"));
const trip_service_1 = require("./trip.service"); // Import local types
const PROTO_PATH = __dirname + '../../../proto/trip.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const tripProto = grpc.loadPackageDefinition(packageDefinition).trip;
function getServer() {
    const server = new grpc.Server();
    server.addService(tripProto.TripService.service, {
        CreateTrip: (call, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const reqTrip = call.request.trip;
                const newTrip = {
                    id: reqTrip.id,
                    userId: reqTrip.user_id,
                    driverId: reqTrip.driver_id || undefined,
                    origin: reqTrip.origin.address,
                    destination: reqTrip.destination.address,
                    status: trip_service_1.TripStatus[reqTrip.status],
                    fare: reqTrip.fare,
                    poolId: reqTrip.pool_id || undefined,
                    passengers: reqTrip.passengers,
                    vehicleType: trip_service_1.VehicleType[reqTrip.vehicle_type] || undefined,
                    maxPassengers: reqTrip.max_passengers || undefined,
                    createdAt: reqTrip.created_at,
                };
                const createdTrip = yield tripService.createTrip(newTrip);
                callback(null, { trip: createdTrip });
            }
            catch (error) {
                console.error('Error in CreateTrip:', error);
                callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
            }
        }),
        GetTrip: (call, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const trip = yield tripService.getTrip(call.request.id);
                if (trip) {
                    callback(null, { trip });
                }
                else {
                    callback({ code: grpc.status.NOT_FOUND, message: 'Trip not found' });
                }
            }
            catch (error) {
                console.error('Error in GetTrip:', error);
                callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
            }
        }),
        GetPool: (call, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const pool = yield tripService.getPool(call.request.id);
                if (pool) {
                    callback(null, { pool });
                }
                else {
                    callback({ code: grpc.status.NOT_FOUND, message: 'Pool not found' });
                }
            }
            catch (error) {
                console.error('Error in GetPool:', error);
                callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
            }
        }),
        JoinPool: (call, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const updatedPool = yield tripService.joinPool(call.request.pool_id, call.request.user_id);
                if (updatedPool) {
                    callback(null, { pool: updatedPool });
                }
                else {
                    callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Could not join pool' });
                }
            }
            catch (error) {
                console.error('Error in JoinPool:', error);
                callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
            }
        }),
        LeavePool: (call, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const updatedPool = yield tripService.leavePool(call.request.pool_id, call.request.user_id);
                if (updatedPool) {
                    callback(null, { pool: updatedPool });
                }
                else {
                    callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Could not leave pool' });
                }
            }
            catch (error) {
                console.error('Error in LeavePool:', error);
                callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
            }
        }),
        GetOpenPools: (call, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const vehicleType = call.request.vehicle_type ? trip_service_1.VehicleType[call.request.vehicle_type] : undefined;
                const openPools = yield tripService.getOpenPools(vehicleType);
                callback(null, { pools: openPools });
            }
            catch (error) {
                console.error('Error in GetOpenPools:', error);
                callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
            }
        }),
        AddFriendToPool: (call, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const updatedPool = yield tripService.addFriendToPool(call.request.pool_id, call.request.friend_unique_id, call.request.requesting_user_id);
                if (updatedPool) {
                    callback(null, { pool: updatedPool });
                }
                else {
                    callback({ code: grpc.status.INVALID_ARGUMENT, message: 'Could not add friend to pool' });
                }
            }
            catch (error) {
                console.error('Error in AddFriendToPool:', error);
                callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
            }
        }),
    });
    return server;
}
function serve() {
    const server = getServer();
    server.bindAsync('0.0.0.0:50053', grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error(`Error starting gRPC server: ${err.message}`);
            return;
        }
        console.log(`gRPC Trip service listening on port ${port}`);
        server.start();
    });
}
serve();
