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
exports.findDriver = exports.DispatchStatus = void 0;
var DispatchStatus;
(function (DispatchStatus) {
    DispatchStatus[DispatchStatus["PENDING"] = 0] = "PENDING";
    DispatchStatus[DispatchStatus["ACCEPTED"] = 1] = "ACCEPTED";
    DispatchStatus[DispatchStatus["REJECTED"] = 2] = "REJECTED";
    DispatchStatus[DispatchStatus["COMPLETED"] = 3] = "COMPLETED";
    DispatchStatus[DispatchStatus["CANCELLED"] = 4] = "CANCELLED";
})(DispatchStatus || (exports.DispatchStatus = DispatchStatus = {}));
// Mock drivers with their current H3 location
const drivers = [
    { id: '1', name: 'Driver 1', available: true, lat: 23.7963, lng: 90.4092, h3Index: '884000000000000' }, // Example: Dhaka H3 index
    { id: '2', name: 'Driver 2', available: true, lat: 23.7960, lng: 90.4090, h3Index: '884000000000000' }, // Example: Dhaka H3 index
    { id: '3', name: 'Driver 3', available: false, lat: 23.8103, lng: 90.4125, h3Index: '884000000000000' }, // Example: Dhaka H3 index
    { id: '4', name: 'Driver 4', available: true, lat: 23.7500, lng: 90.3600, h3Index: '884000000000000' }, // Example: Farther away H3 index
];
const findDriver = (trip) => __awaiter(void 0, void 0, void 0, function* () {
    const h3 = yield Promise.resolve().then(() => __importStar(require('h3-js')));
    // Extract lat/lng from trip.origin (which is now a Location object)
    const originLat = trip.origin.lat;
    const originLng = trip.origin.lng;
    if (isNaN(originLat) || isNaN(originLng)) {
        console.error("Invalid trip origin coordinates:", trip.origin);
        return undefined;
    }
    const resolution = 8; // H3 resolution for driver search
    const originH3Index = h3.geoToH3(originLat, originLng, resolution);
    let searchKRings = [];
    // Start with k=1 ring
    searchKRings = h3.kRing(originH3Index, 1);
    let availableDriver = drivers.find(driver => driver.available && searchKRings.includes(driver.h3Index));
    // If no driver found in k=1, expand to k=2
    if (!availableDriver) {
        searchKRings = h3.kRing(originH3Index, 2);
        availableDriver = drivers.find(driver => driver.available && searchKRings.includes(driver.h3Index));
    }
    if (availableDriver) {
        return {
            id: `dispatch-${Date.now()}`,
            tripId: trip.id,
            driverId: availableDriver.id,
            status: DispatchStatus.PENDING,
        };
    }
    else {
        return undefined;
    }
});
exports.findDriver = findDriver;
