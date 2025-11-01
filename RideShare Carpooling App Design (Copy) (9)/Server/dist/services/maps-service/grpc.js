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
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGrpcServer = void 0;
const grpc = __importStar(require("@grpc/grpc-js"));
const maps_service_1 = require("./maps.service");
const maps_grpc_pb_1 = require("../../proto/maps_grpc_pb");
const maps_pb_1 = require("../../proto/maps_pb");
const mapsService = new maps_service_1.MapsService();
const mapsServer = {
    geocode: (call, callback) => {
        mapsService.geocode(call.request.getAddress())
            .then(location => {
            if (!location) {
                const error = new Error('Location not found.');
                error.code = grpc.status.NOT_FOUND;
                callback(error, null);
                return;
            }
            const response = new maps_pb_1.GeocodeResponse();
            const loc = new maps_pb_1.Location();
            loc.setLat(location.location.lat);
            loc.setLng(location.location.lng);
            response.setLocation(loc);
            callback(null, response);
        })
            .catch((err) => callback(err, null));
    },
    reverseGeocode: (call, callback) => {
        const location = call.request.getLocation();
        if (!location) {
            const error = new Error('Location is required.');
            error.code = grpc.status.INVALID_ARGUMENT;
            callback(error, null);
            return;
        }
        mapsService.reverseGeocode({ lat: location.getLat(), lng: location.getLng(), address: '' })
            .then(address => {
            if (!address) {
                const error = new Error('Address not found.');
                error.code = grpc.status.NOT_FOUND;
                callback(error, null);
                return;
            }
            const response = new maps_pb_1.ReverseGeocodeResponse();
            response.setAddress(address.address);
            callback(null, response);
        })
            .catch((err) => callback(err, null));
    },
    getRoute: (call, callback) => {
        const start = call.request.getStart();
        const end = call.request.getEnd();
        if (!start || !end) {
            const error = new Error('Start and end locations are required.');
            error.code = grpc.status.INVALID_ARGUMENT;
            callback(error, null);
            return;
        }
        mapsService.getRoute({ lat: start.getLat(), lng: start.getLng(), address: '' }, { lat: end.getLat(), lng: end.getLng(), address: '' })
            .then(route => {
            if (!route) {
                const error = new Error('Route not found.');
                error.code = grpc.status.NOT_FOUND;
                callback(error, null);
                return;
            }
            const response = new maps_pb_1.GetRouteResponse();
            const path = route.path.map((p) => {
                const loc = new maps_pb_1.Location();
                loc.setLat(p.lat);
                loc.setLng(p.lng);
                return loc;
            });
            response.setPathList(path);
            response.setDistance(route.distance);
            response.setDuration(route.duration);
            callback(null, response);
        })
            .catch((err) => callback(err, null));
    }
};
const startGrpcServer = () => {
    const server = new grpc.Server();
    server.addService(maps_grpc_pb_1.MapsService, mapsServer);
    server.bindAsync('0.0.0.0:50057', grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err) {
            console.error(`Error starting gRPC server for maps service: ${err.message}`);
            return;
        }
        console.log(`gRPC server for maps service listening on port ${port}`);
        server.start();
    });
};
exports.startGrpcServer = startGrpcServer;
