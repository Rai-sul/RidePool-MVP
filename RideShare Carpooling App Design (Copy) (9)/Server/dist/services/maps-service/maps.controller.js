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
exports.getKRing = exports.getH3Index = exports.calculateRoute = exports.reverseGeocode = exports.geocodeAddress = void 0;
const mapsService = __importStar(require("./maps.service"));
const geocodeAddress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { address } = req.query;
    if (!address || typeof address !== 'string') {
        return res.status(400).send('Address query parameter is required.');
    }
    try {
        const result = yield mapsService.geocodeAddress(address);
        if (result) {
            res.json(result);
        }
        else {
            res.status(404).send('Location not found for the given address.');
        }
    }
    catch (error) {
        console.error('Error geocoding address:', error);
        res.status(500).send('Internal server error.');
    }
});
exports.geocodeAddress = geocodeAddress;
const reverseGeocode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { lat, lng } = req.query;
    if (!lat || !lng || typeof lat !== 'string' || typeof lng !== 'string') {
        return res.status(400).send('Latitude and longitude query parameters are required.');
    }
    const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    try {
        const result = yield mapsService.reverseGeocode(location);
        if (result) {
            res.json(result);
        }
        else {
            res.status(404).send('Address not found for the given coordinates.');
        }
    }
    catch (error) {
        console.error('Error reverse geocoding:', error);
        res.status(500).send('Internal server error.');
    }
});
exports.reverseGeocode = reverseGeocode;
const calculateRoute = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { originLat, originLng, destinationLat, destinationLng } = req.query;
    if (!originLat || !originLng || !destinationLat || !destinationLng ||
        typeof originLat !== 'string' || typeof originLng !== 'string' ||
        typeof destinationLat !== 'string' || typeof destinationLng !== 'string') {
        return res.status(400).send('Origin and destination coordinates are required.');
    }
    const origin = { lat: parseFloat(originLat), lng: parseFloat(originLng) };
    const destination = { lat: parseFloat(destinationLat), lng: parseFloat(destinationLng) };
    try {
        const route = yield mapsService.calculateRoute(origin, destination);
        if (route) {
            res.json(route);
        }
        else {
            res.status(404).send('Route could not be calculated.');
        }
    }
    catch (error) {
        console.error('Error calculating route:', error);
        res.status(500).send('Internal server error.');
    }
});
exports.calculateRoute = calculateRoute;
const getH3Index = (req, res) => {
    const { lat, lng, resolution } = req.query;
    if (!lat || !lng || typeof lat !== 'string' || typeof lng !== 'string') {
        return res.status(400).send('Latitude and longitude are required.');
    }
    const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const h3Resolution = resolution ? parseInt(resolution) : 8;
    try {
        const h3Index = mapsService.getH3Index(location, h3Resolution);
        res.json({ h3Index });
    }
    catch (error) {
        console.error('Error getting H3 index:', error);
        res.status(500).send('Internal server error.');
    }
};
exports.getH3Index = getH3Index;
const getKRing = (req, res) => {
    const { h3Index, k } = req.query;
    if (!h3Index || typeof h3Index !== 'string') {
        return res.status(400).send('H3 index is required.');
    }
    const kValue = k ? parseInt(k) : 1;
    try {
        const kRing = mapsService.getKRing(h3Index, kValue);
        res.json({ kRing });
    }
    catch (error) {
        console.error('Error getting k-ring:', error);
        res.status(500).send('Internal server error.');
    }
};
exports.getKRing = getKRing;
