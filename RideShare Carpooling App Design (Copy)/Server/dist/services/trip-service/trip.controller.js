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
exports.addFriendToPool = exports.getOpenPools = exports.leavePool = exports.joinPool = exports.getPool = exports.getTrip = exports.createTrip = void 0;
const tripService = __importStar(require("./trip.service"));
const createTrip = (req, res) => {
    const trip = tripService.createTrip(req.body);
    res.status(201).json(trip);
};
exports.createTrip = createTrip;
const getTrip = (req, res) => {
    const trip = tripService.getTrip(req.params.id);
    if (trip) {
        res.json(trip);
    }
    else {
        res.status(404).send('Trip not found');
    }
};
exports.getTrip = getTrip;
const getPool = (req, res) => {
    const pool = tripService.getPool(req.params.id);
    if (pool) {
        res.json(pool);
    }
    else {
        res.status(404).send('Pool not found');
    }
};
exports.getPool = getPool;
const joinPool = (req, res) => {
    const { poolId, userId } = req.body;
    const updatedPool = tripService.joinPool(poolId, userId);
    if (updatedPool) {
        res.json(updatedPool);
    }
    else {
        res.status(400).send('Could not join pool or user is on cooldown');
    }
};
exports.joinPool = joinPool;
const leavePool = (req, res) => {
    const { poolId, userId } = req.body;
    const updatedPool = tripService.leavePool(poolId, userId);
    if (updatedPool) {
        res.json(updatedPool);
    }
    else {
        res.status(400).send('Could not leave pool');
    }
};
exports.leavePool = leavePool;
const getOpenPools = (req, res) => {
    const { vehicleType } = req.query;
    const openPools = tripService.getOpenPools(vehicleType);
    res.json(openPools);
};
exports.getOpenPools = getOpenPools;
const addFriendToPool = (req, res) => {
    const { poolId, friendUniqueId, requestingUserId } = req.body;
    const updatedPool = tripService.addFriendToPool(poolId, friendUniqueId, requestingUserId);
    if (updatedPool) {
        res.json(updatedPool);
    }
    else {
        res.status(400).send('Could not add friend to pool');
    }
};
exports.addFriendToPool = addFriendToPool;
