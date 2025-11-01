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
const pricingService = __importStar(require("./pricing.service"));
const trip_service_1 = require("../trip-service/trip.service"); // Import Trip types
const PROTO_PATH = __dirname + '../../../proto/pricing.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const pricingProto = grpc.loadPackageDefinition(packageDefinition).pricing;
function getServer() {
    const server = new grpc.Server();
    server.addService(pricingProto.PricingService.service, {
        CalculateFare: (call, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const reqTrip = call.request.trip;
                const trip = {
                    id: reqTrip.id,
                    userId: reqTrip.user_id,
                    driverId: reqTrip.driver_id || undefined,
                    origin: {
                        lat: reqTrip.origin.lat,
                        lng: reqTrip.origin.lng,
                        address: reqTrip.origin.address,
                    },
                    destination: {
                        lat: reqTrip.destination.lat,
                        lng: reqTrip.destination.lng,
                        address: reqTrip.destination.address,
                    },
                    status: trip_service_1.TripStatus[reqTrip.status],
                    fare: reqTrip.fare,
                    poolId: reqTrip.pool_id || undefined,
                    passengers: reqTrip.passengers,
                    vehicleType: trip_service_1.VehicleType[reqTrip.vehicle_type] || undefined,
                    maxPassengers: reqTrip.max_passengers || undefined,
                    createdAt: reqTrip.created_at,
                };
                const price = pricingService.calculateFare(trip);
                callback(null, { price });
            }
            catch (error) {
                console.error('Error in CalculateFare:', error);
                callback({ code: grpc.status.INTERNAL, message: 'Internal server error' });
            }
        }),
    });
    return server;
}
function serve() {
    const server = getServer();
    server.bindAsync('0.0.0.0:50055', grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error(`Error starting gRPC server: ${err.message}`);
            return;
        }
        console.log(`gRPC Pricing service listening on port ${port}`);
        server.start();
    });
}
serve();
