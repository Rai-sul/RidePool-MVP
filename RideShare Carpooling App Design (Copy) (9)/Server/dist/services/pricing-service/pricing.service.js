"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFare = void 0;
const baseFare = 10;
const surgeMultiplier = 1.5;
const calculateFare = (trip) => {
    const fare = baseFare * surgeMultiplier;
    return {
        tripId: trip.id,
        fare,
        surgeMultiplier,
    };
};
exports.calculateFare = calculateFare;
