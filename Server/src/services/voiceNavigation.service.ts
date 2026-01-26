import { googleMapsService } from './googleMaps.service';
import { i18nService, SupportedLanguage } from './i18n.service';
import { logger } from '../utils/logger';

export interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  maneuver: NavigationManeuver;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
  roadName: string;
}

export type NavigationManeuver =
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'TURN_SLIGHT_LEFT'
  | 'TURN_SLIGHT_RIGHT'
  | 'TURN_SHARP_LEFT'
  | 'TURN_SHARP_RIGHT'
  | 'STRAIGHT'
  | 'UTURN_LEFT'
  | 'UTURN_RIGHT'
  | 'ROUNDABOUT_LEFT'
  | 'ROUNDABOUT_RIGHT'
  | 'MERGE'
  | 'FORK_LEFT'
  | 'FORK_RIGHT'
  | 'RAMP_LEFT'
  | 'RAMP_RIGHT'
  | 'KEEP_LEFT'
  | 'KEEP_RIGHT'
  | 'ARRIVE'
  | 'DEPART';

export interface VoiceInstruction {
  text: string;
  ssml: string;
  distanceToTrigger: number;
  stepIndex: number;
  language: SupportedLanguage;
}

export interface NavigationRoute {
  totalDistance: number;
  totalDuration: number;
  steps: NavigationStep[];
  polyline: string;
  waypoints: Array<{ lat: number; lng: number; name?: string }>;
}

export interface NavigationState {
  currentStepIndex: number;
  distanceToNextStep: number;
  distanceRemaining: number;
  timeRemaining: number;
  nextManeuver: NavigationManeuver | null;
  isOffRoute: boolean;
  arrivedAtDestination: boolean;
}

const VOICE_TEMPLATES = {
  en: {
    TURN_LEFT: 'Turn left',
    TURN_RIGHT: 'Turn right',
    TURN_SLIGHT_LEFT: 'Turn slightly left',
    TURN_SLIGHT_RIGHT: 'Turn slightly right',
    TURN_SHARP_LEFT: 'Turn sharp left',
    TURN_SHARP_RIGHT: 'Turn sharp right',
    STRAIGHT: 'Continue straight',
    UTURN_LEFT: 'Make a U-turn',
    UTURN_RIGHT: 'Make a U-turn',
    ROUNDABOUT_LEFT: 'At the roundabout, take the left exit',
    ROUNDABOUT_RIGHT: 'At the roundabout, take the right exit',
    MERGE: 'Merge',
    FORK_LEFT: 'Keep left at the fork',
    FORK_RIGHT: 'Keep right at the fork',
    RAMP_LEFT: 'Take the ramp on the left',
    RAMP_RIGHT: 'Take the ramp on the right',
    KEEP_LEFT: 'Keep left',
    KEEP_RIGHT: 'Keep right',
    ARRIVE: 'You have arrived at your destination',
    DEPART: 'Head',
    IN_METERS: 'In {{distance}} meters',
    IN_KILOMETERS: 'In {{distance}} kilometers',
    ONTO: 'onto {{road}}',
    THEN: 'then',
    RECALCULATING: 'Recalculating route',
    OFF_ROUTE: 'You are off route',
    PICKUP_AHEAD: 'Pickup point is {{distance}} meters ahead',
    DROPOFF_AHEAD: 'Drop-off point is {{distance}} meters ahead',
    ARRIVING_AT_PICKUP: 'Arriving at pickup point',
    ARRIVING_AT_DROPOFF: 'Arriving at drop-off point',
  },
  bn: {
    TURN_LEFT: 'বামে ঘুরুন',
    TURN_RIGHT: 'ডানে ঘুরুন',
    TURN_SLIGHT_LEFT: 'সামান্য বামে ঘুরুন',
    TURN_SLIGHT_RIGHT: 'সামান্য ডানে ঘুরুন',
    TURN_SHARP_LEFT: 'তীব্রভাবে বামে ঘুরুন',
    TURN_SHARP_RIGHT: 'তীব্রভাবে ডানে ঘুরুন',
    STRAIGHT: 'সোজা চালিয়ে যান',
    UTURN_LEFT: 'ইউ-টার্ন নিন',
    UTURN_RIGHT: 'ইউ-টার্ন নিন',
    ROUNDABOUT_LEFT: 'গোলচত্বরে বাম দিকে বের হন',
    ROUNDABOUT_RIGHT: 'গোলচত্বরে ডান দিকে বের হন',
    MERGE: 'মার্জ করুন',
    FORK_LEFT: 'কাঁটায় বামে থাকুন',
    FORK_RIGHT: 'কাঁটায় ডানে থাকুন',
    RAMP_LEFT: 'বাম দিকের র্যাম্প নিন',
    RAMP_RIGHT: 'ডান দিকের র্যাম্প নিন',
    KEEP_LEFT: 'বামে থাকুন',
    KEEP_RIGHT: 'ডানে থাকুন',
    ARRIVE: 'আপনি গন্তব্যে পৌঁছেছেন',
    DEPART: 'এদিকে যান',
    IN_METERS: '{{distance}} মিটার পরে',
    IN_KILOMETERS: '{{distance}} কিলোমিটার পরে',
    ONTO: '{{road}} রোডে',
    THEN: 'তারপর',
    RECALCULATING: 'রুট পুনর্গণনা করা হচ্ছে',
    OFF_ROUTE: 'আপনি রুট থেকে বিচ্যুত',
    PICKUP_AHEAD: 'পিকআপ পয়েন্ট {{distance}} মিটার সামনে',
    DROPOFF_AHEAD: 'ড্রপ-অফ পয়েন্ট {{distance}} মিটার সামনে',
    ARRIVING_AT_PICKUP: 'পিকআপ পয়েন্টে পৌঁছাচ্ছেন',
    ARRIVING_AT_DROPOFF: 'ড্রপ-অফ পয়েন্টে পৌঁছাচ্ছেন',
  },
};

const TRIGGER_DISTANCES = {
  FAR: 500,
  MEDIUM: 200,
  NEAR: 50,
  IMMEDIATE: 20,
};

export class VoiceNavigationService {
  async getNavigationRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints?: Array<{ lat: number; lng: number; name?: string }>
  ): Promise<NavigationRoute | null> {
    try {
      const waypointLocations = waypoints?.map(w => ({ latitude: w.lat, longitude: w.lng }));
      const route = await googleMapsService.getRoute(
        { latitude: origin.lat, longitude: origin.lng },
        { latitude: destination.lat, longitude: destination.lng },
        waypointLocations ? { waypoints: waypointLocations } : undefined
      );

      if (!route) {
        return null;
      }

      const steps: NavigationStep[] = this.parseGoogleSteps(route.steps || []);

      return {
        totalDistance: route.distance,
        totalDuration: route.duration,
        steps,
        polyline: route.geometry?.encoded || '',
        waypoints: waypoints || [],
      };
    } catch (error) {
      logger.error('[VoiceNavigationService] getNavigationRoute error:', error);
      return null;
    }
  }

  generateVoiceInstructions(
    route: NavigationRoute,
    language: SupportedLanguage = 'en'
  ): VoiceInstruction[] {
    const instructions: VoiceInstruction[] = [];
    const templates = VOICE_TEMPLATES[language];

    route.steps.forEach((step, index) => {
      if (step.distance > TRIGGER_DISTANCES.FAR) {
        instructions.push(this.createInstruction(
          step,
          index,
          TRIGGER_DISTANCES.FAR,
          language,
          templates
        ));
      }

      if (step.distance > TRIGGER_DISTANCES.MEDIUM) {
        instructions.push(this.createInstruction(
          step,
          index,
          TRIGGER_DISTANCES.MEDIUM,
          language,
          templates
        ));
      }

      instructions.push(this.createInstruction(
        step,
        index,
        TRIGGER_DISTANCES.NEAR,
        language,
        templates
      ));
    });

    instructions.push({
      text: templates.ARRIVE,
      ssml: this.toSSML(templates.ARRIVE),
      distanceToTrigger: TRIGGER_DISTANCES.IMMEDIATE,
      stepIndex: route.steps.length - 1,
      language,
    });

    return instructions;
  }

  getVoiceInstructionForDistance(
    step: NavigationStep,
    distanceToStep: number,
    language: SupportedLanguage = 'en'
  ): VoiceInstruction | null {
    const templates = VOICE_TEMPLATES[language];

    let triggerDistance: number;
    if (distanceToStep > TRIGGER_DISTANCES.FAR) {
      return null;
    } else if (distanceToStep > TRIGGER_DISTANCES.MEDIUM) {
      triggerDistance = TRIGGER_DISTANCES.FAR;
    } else if (distanceToStep > TRIGGER_DISTANCES.NEAR) {
      triggerDistance = TRIGGER_DISTANCES.MEDIUM;
    } else {
      triggerDistance = TRIGGER_DISTANCES.NEAR;
    }

    return this.createInstruction(step, 0, triggerDistance, language, templates);
  }

  calculateNavigationState(
    route: NavigationRoute,
    currentLocation: { lat: number; lng: number },
    previousStepIndex: number = 0
  ): NavigationState {
    let currentStepIndex = previousStepIndex;
    let distanceToNextStep = 0;
    let distanceRemaining = 0;
    let timeRemaining = 0;
    let isOffRoute = false;

    for (let i = previousStepIndex; i < route.steps.length; i++) {
      const step = route.steps[i];
      const distanceToStepEnd = this.calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        step.endLocation.lat,
        step.endLocation.lng
      );

      if (distanceToStepEnd < 30) {
        currentStepIndex = i + 1;
      } else {
        currentStepIndex = i;
        break;
      }
    }

    if (currentStepIndex < route.steps.length) {
      const currentStep = route.steps[currentStepIndex];
      distanceToNextStep = this.calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        currentStep.endLocation.lat,
        currentStep.endLocation.lng
      );

      for (let i = currentStepIndex; i < route.steps.length; i++) {
        distanceRemaining += route.steps[i].distance;
        timeRemaining += route.steps[i].duration;
      }

      const distanceToRoute = this.getDistanceToRoute(currentLocation, route);
      isOffRoute = distanceToRoute > 50;
    }

    const arrivedAtDestination = currentStepIndex >= route.steps.length - 1 && 
      distanceToNextStep < TRIGGER_DISTANCES.IMMEDIATE;

    const nextManeuver = currentStepIndex < route.steps.length
      ? route.steps[currentStepIndex].maneuver
      : null;

    return {
      currentStepIndex,
      distanceToNextStep: Math.round(distanceToNextStep),
      distanceRemaining: Math.round(distanceRemaining),
      timeRemaining: Math.round(timeRemaining / 60),
      nextManeuver,
      isOffRoute,
      arrivedAtDestination,
    };
  }

  generateRecalculatingMessage(language: SupportedLanguage = 'en'): VoiceInstruction {
    const templates = VOICE_TEMPLATES[language];
    return {
      text: templates.RECALCULATING,
      ssml: this.toSSML(templates.RECALCULATING),
      distanceToTrigger: 0,
      stepIndex: -1,
      language,
    };
  }

  generateWaypointApproachMessage(
    waypointType: 'PICKUP' | 'DROPOFF',
    distance: number,
    language: SupportedLanguage = 'en'
  ): VoiceInstruction {
    const templates = VOICE_TEMPLATES[language];
    
    let text: string;
    if (distance < 30) {
      text = waypointType === 'PICKUP' 
        ? templates.ARRIVING_AT_PICKUP 
        : templates.ARRIVING_AT_DROPOFF;
    } else {
      const template = waypointType === 'PICKUP' 
        ? templates.PICKUP_AHEAD 
        : templates.DROPOFF_AHEAD;
      text = template.replace('{{distance}}', String(Math.round(distance)));
    }

    return {
      text,
      ssml: this.toSSML(text),
      distanceToTrigger: distance,
      stepIndex: -1,
      language,
    };
  }

  private createInstruction(
    step: NavigationStep,
    stepIndex: number,
    triggerDistance: number,
    language: SupportedLanguage,
    templates: typeof VOICE_TEMPLATES['en']
  ): VoiceInstruction {
    const maneuverText = templates[step.maneuver] || templates.STRAIGHT;
    let distanceText: string;

    if (triggerDistance >= 1000) {
      distanceText = templates.IN_KILOMETERS.replace(
        '{{distance}}',
        String(Math.round(triggerDistance / 100) / 10)
      );
    } else {
      distanceText = templates.IN_METERS.replace('{{distance}}', String(triggerDistance));
    }

    let fullText = `${distanceText}, ${maneuverText}`;
    
    if (step.roadName && step.roadName !== 'Unknown') {
      fullText += ` ${templates.ONTO.replace('{{road}}', step.roadName)}`;
    }

    return {
      text: fullText,
      ssml: this.toSSML(fullText),
      distanceToTrigger: triggerDistance,
      stepIndex,
      language,
    };
  }

  private toSSML(text: string): string {
    return `<speak>${text}</speak>`;
  }

  private parseGoogleSteps(googleSteps: any[]): NavigationStep[] {
    return googleSteps.map((step) => {
      const maneuver = this.parseManeuver(step.maneuver || '');
      const instruction = step.html_instructions 
        ? step.html_instructions.replace(/<[^>]*>/g, '')
        : '';

      return {
        instruction,
        distance: step.distance?.value || 0,
        duration: step.duration?.value || 0,
        maneuver,
        startLocation: {
          lat: step.start_location?.lat || 0,
          lng: step.start_location?.lng || 0,
        },
        endLocation: {
          lat: step.end_location?.lat || 0,
          lng: step.end_location?.lng || 0,
        },
        roadName: this.extractRoadName(instruction),
      };
    });
  }

  private parseManeuver(maneuver: string): NavigationManeuver {
    const maneuverMap: Record<string, NavigationManeuver> = {
      'turn-left': 'TURN_LEFT',
      'turn-right': 'TURN_RIGHT',
      'turn-slight-left': 'TURN_SLIGHT_LEFT',
      'turn-slight-right': 'TURN_SLIGHT_RIGHT',
      'turn-sharp-left': 'TURN_SHARP_LEFT',
      'turn-sharp-right': 'TURN_SHARP_RIGHT',
      'straight': 'STRAIGHT',
      'uturn-left': 'UTURN_LEFT',
      'uturn-right': 'UTURN_RIGHT',
      'roundabout-left': 'ROUNDABOUT_LEFT',
      'roundabout-right': 'ROUNDABOUT_RIGHT',
      'merge': 'MERGE',
      'fork-left': 'FORK_LEFT',
      'fork-right': 'FORK_RIGHT',
      'ramp-left': 'RAMP_LEFT',
      'ramp-right': 'RAMP_RIGHT',
      'keep-left': 'KEEP_LEFT',
      'keep-right': 'KEEP_RIGHT',
      'arrive': 'ARRIVE',
      'depart': 'DEPART',
    };

    return maneuverMap[maneuver] || 'STRAIGHT';
  }

  private extractRoadName(instruction: string): string {
    const ontoMatch = instruction.match(/onto\s+(.+?)(?:\s|$)/i);
    if (ontoMatch) {
      return ontoMatch[1];
    }

    const atMatch = instruction.match(/at\s+(.+?)(?:\s|$)/i);
    if (atMatch) {
      return atMatch[1];
    }

    return 'Unknown';
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private getDistanceToRoute(
    location: { lat: number; lng: number },
    route: NavigationRoute
  ): number {
    let minDistance = Infinity;

    for (const step of route.steps) {
      const distToStart = this.calculateDistance(
        location.lat,
        location.lng,
        step.startLocation.lat,
        step.startLocation.lng
      );
      const distToEnd = this.calculateDistance(
        location.lat,
        location.lng,
        step.endLocation.lat,
        step.endLocation.lng
      );

      minDistance = Math.min(minDistance, distToStart, distToEnd);
    }

    return minDistance;
  }
}

export const voiceNavigationService = new VoiceNavigationService();
