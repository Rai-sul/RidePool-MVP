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
exports.MapsService = void 0;
const h3 = __importStar(require("h3-js"));
// Mock data for demonstration (will be replaced or augmented)
const mockLocations = {
    'Dhaka': { lat: 23.7776, lng: 90.3994, address: 'Dhaka, Bangladesh' },
    'Chittagong': { lat: 22.3569, lng: 91.7864, address: 'Chittagong, Bangladesh' },
    'Gulshan 1': { lat: 23.7897, lng: 90.4000, address: 'Gulshan 1, Dhaka' },
    'Mirpur 10': { lat: 23.8069, lng: 90.3675, address: 'Mirpur 10, Dhaka' },
};
// In-memory cache for H3 indices
const h3Cache = new Map();
class MapsService {
    geocode(address) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield fetch(`https://nominatim.openstreetmap.org/search?` +
                    `q=${encodeURIComponent(address)}&format=json&countrycodes=bd`);
                const data = yield response.json();
                if (data && data.length > 0) {
                    const firstResult = data[0];
                    return {
                        address: firstResult.display_name,
                        location: { lat: parseFloat(firstResult.lat), lng: parseFloat(firstResult.lon) },
                    };
                }
            }
            catch (error) {
                console.error('Error geocoding with OpenStreetMap Nominatim:', error);
            }
            // Fallback to mock data if API fails or no result
            const lowerCaseAddress = address.toLowerCase();
            for (const key in mockLocations) {
                if (key.toLowerCase().includes(lowerCaseAddress) || ((_a = mockLocations[key].address) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(lowerCaseAddress))) {
                    return { address: mockLocations[key].address || address, location: mockLocations[key] };
                }
            }
            return undefined;
        });
    }
    reverseGeocode(location) {
        return __awaiter(this, void 0, void 0, function* () {
            // In a real application, this would call a reverse geocoding API
            // For mock, just return a predefined address if coordinates match closely
            if (location.lat === 23.7776 && location.lng === 90.3994) {
                return { address: 'Dhaka, Bangladesh', location };
            }
            return undefined;
        });
    }
    getRoute(origin, destination) {
        return __awaiter(this, void 0, void 0, function* () {
            // In a real application, this would call a routing API
            // Simple Euclidean distance for mock
            const distance = Math.sqrt(Math.pow(origin.lat - destination.lat, 2) + Math.pow(origin.lng - destination.lng, 2)) * 111; // Rough conversion to km (1 degree lat ~ 111 km)
            const duration = distance * 2; // Mock: 2 minutes per km
            return {
                origin,
                destination,
                distance: parseFloat(distance.toFixed(2)),
                duration: parseFloat(duration.toFixed(2)),
                path: [], // Placeholder for path
                polyline: 'mock_polyline_string', // Placeholder
            };
        });
    }
    getH3Index(location, resolution = 8) {
        const cacheKey = `${location.lat},${location.lng},${resolution}`;
        if (h3Cache.has(cacheKey)) {
            return h3Cache.get(cacheKey);
        }
        const index = h3.geoToH3(location.lat, location.lng, resolution);
        h3Cache.set(cacheKey, index);
        return index;
    }
    getKRing(h3Index, k = 1) {
        return h3.kRing(h3Index, k);
    }
}
exports.MapsService = MapsService;
