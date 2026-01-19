import { logger } from '../utils/logger';

export type SupportedLanguage = 'en' | 'bn';

export interface TranslationKey {
  [key: string]: string | TranslationKey;
}

export interface LocalizedString {
  en: string;
  bn: string;
}

const translations: Record<SupportedLanguage, TranslationKey> = {
  en: {
    common: {
      success: 'Success',
      error: 'Error',
      loading: 'Loading...',
      retry: 'Retry',
      cancel: 'Cancel',
      confirm: 'Confirm',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      back: 'Back',
      next: 'Next',
      done: 'Done',
      close: 'Close',
      search: 'Search',
      noResults: 'No results found',
      required: 'Required',
      optional: 'Optional',
    },
    auth: {
      login: 'Login',
      logout: 'Logout',
      register: 'Register',
      phone: 'Phone Number',
      otp: 'Enter OTP',
      resendOtp: 'Resend OTP',
      verifyPhone: 'Verify Phone',
      welcomeBack: 'Welcome back!',
      createAccount: 'Create an account',
      forgotPassword: 'Forgot Password?',
      phoneRequired: 'Phone number is required',
      invalidPhone: 'Invalid phone number',
      otpSent: 'OTP sent successfully',
      otpExpired: 'OTP has expired',
      invalidOtp: 'Invalid OTP',
    },
    ride: {
      requestRide: 'Request Ride',
      findingPool: 'Finding pool...',
      waitingForDriver: 'Waiting for driver',
      driverAssigned: 'Driver assigned',
      rideStarted: 'Ride started',
      rideCompleted: 'Ride completed',
      rideCancelled: 'Ride cancelled',
      pickup: 'Pickup',
      dropoff: 'Drop-off',
      destination: 'Destination',
      estimatedFare: 'Estimated Fare',
      estimatedTime: 'Estimated Time',
      distance: 'Distance',
      passengers: 'Passengers',
      poolSize: 'Pool Size',
      savings: 'You save',
      cancelRide: 'Cancel Ride',
      confirmCancel: 'Are you sure you want to cancel?',
      cancelWarning: 'Cancellation fees may apply',
      lookupTime: 'Looking for more passengers',
      lookupTimeRemaining: 'Time remaining',
      noPoolsFound: 'No matching pools found',
      createNewPool: 'Create a new pool',
      joinPool: 'Join Pool',
      leavePool: 'Leave Pool',
    },
    driver: {
      goOnline: 'Go Online',
      goOffline: 'Go Offline',
      online: 'Online',
      offline: 'Offline',
      busy: 'Busy',
      acceptRide: 'Accept Ride',
      rejectRide: 'Reject Ride',
      startRide: 'Start Ride',
      completeRide: 'Complete Ride',
      pickupPassenger: 'Pick up passenger',
      dropoffPassenger: 'Drop off passenger',
      navigation: 'Navigation',
      earnings: 'Earnings',
      todayEarnings: "Today's Earnings",
      weeklyEarnings: 'Weekly Earnings',
      trips: 'Trips',
      rating: 'Rating',
      heatmap: 'Demand Heatmap',
      surgeZone: 'Surge Zone',
      highDemand: 'High demand area',
      priorityLocation: 'Priority Destination',
      setPriority: 'Set Priority Location',
      clearPriority: 'Clear Priority',
    },
    pool: {
      poolFound: 'Pool found!',
      waitingForRiders: 'Waiting for more riders',
      poolReady: 'Pool is ready',
      poolStarted: 'Pool started',
      poolCompleted: 'Pool completed',
      coPassengers: 'Co-passengers',
      femaleOnly: 'Female only',
      anyGender: 'Any gender',
      vehicleType: 'Vehicle Type',
      car: 'Car',
      cng: 'CNG',
      maxPassengers: 'Maximum passengers',
    },
    payment: {
      payment: 'Payment',
      payNow: 'Pay Now',
      wallet: 'Wallet',
      walletBalance: 'Wallet Balance',
      addMoney: 'Add Money',
      paymentMethod: 'Payment Method',
      cash: 'Cash',
      card: 'Card',
      mobileBanking: 'Mobile Banking',
      bkash: 'bKash',
      nagad: 'Nagad',
      transactionHistory: 'Transaction History',
      paymentSuccessful: 'Payment successful',
      paymentFailed: 'Payment failed',
      insufficientBalance: 'Insufficient balance',
      promoCode: 'Promo Code',
      applyPromo: 'Apply Promo',
      promoApplied: 'Promo applied',
      invalidPromo: 'Invalid promo code',
    },
    safety: {
      sos: 'SOS',
      emergency: 'Emergency',
      shareRide: 'Share Ride',
      rideShared: 'Ride shared successfully',
      emergencyContacts: 'Emergency Contacts',
      addContact: 'Add Contact',
      callPolice: 'Call Police',
      reportIssue: 'Report Issue',
      feelingUnsafe: 'Feeling unsafe?',
      sosActivated: 'SOS activated - Help is on the way',
    },
    rating: {
      rateRide: 'Rate your ride',
      rateDriver: 'Rate driver',
      ratePassenger: 'Rate passenger',
      howWasRide: 'How was your ride?',
      leaveComment: 'Leave a comment (optional)',
      thankYou: 'Thank you for your feedback!',
      stars: 'stars',
    },
    notification: {
      notifications: 'Notifications',
      noNotifications: 'No notifications',
      markAllRead: 'Mark all as read',
      poolMatch: 'Pool match found',
      driverArriving: 'Driver is arriving',
      rideReminder: 'Ride reminder',
      paymentReminder: 'Payment reminder',
      promoAvailable: 'New promo available',
    },
    settings: {
      settings: 'Settings',
      profile: 'Profile',
      language: 'Language',
      english: 'English',
      bangla: 'বাংলা',
      notifications: 'Notifications',
      privacy: 'Privacy',
      help: 'Help & Support',
      about: 'About',
      terms: 'Terms of Service',
      privacyPolicy: 'Privacy Policy',
      deleteAccount: 'Delete Account',
      version: 'Version',
    },
    errors: {
      networkError: 'Network error. Please try again.',
      serverError: 'Server error. Please try again later.',
      unauthorized: 'Please login to continue',
      notFound: 'Not found',
      invalidInput: 'Invalid input',
      somethingWrong: 'Something went wrong',
      tryAgain: 'Please try again',
      sessionExpired: 'Session expired. Please login again.',
    },
    units: {
      km: 'km',
      mins: 'mins',
      hours: 'hours',
      bdt: '৳',
      taka: 'Taka',
    },
  },
  bn: {
    common: {
      success: 'সফল',
      error: 'ত্রুটি',
      loading: 'লোড হচ্ছে...',
      retry: 'পুনরায় চেষ্টা করুন',
      cancel: 'বাতিল',
      confirm: 'নিশ্চিত করুন',
      save: 'সংরক্ষণ করুন',
      delete: 'মুছুন',
      edit: 'সম্পাদনা',
      back: 'পিছনে',
      next: 'পরবর্তী',
      done: 'সম্পন্ন',
      close: 'বন্ধ করুন',
      search: 'খুঁজুন',
      noResults: 'কোন ফলাফল পাওয়া যায়নি',
      required: 'আবশ্যক',
      optional: 'ঐচ্ছিক',
    },
    auth: {
      login: 'লগইন',
      logout: 'লগআউট',
      register: 'নিবন্ধন করুন',
      phone: 'ফোন নম্বর',
      otp: 'OTP লিখুন',
      resendOtp: 'পুনরায় OTP পাঠান',
      verifyPhone: 'ফোন যাচাই করুন',
      welcomeBack: 'স্বাগতম!',
      createAccount: 'একটি অ্যাকাউন্ট তৈরি করুন',
      forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?',
      phoneRequired: 'ফোন নম্বর প্রয়োজন',
      invalidPhone: 'অবৈধ ফোন নম্বর',
      otpSent: 'OTP সফলভাবে পাঠানো হয়েছে',
      otpExpired: 'OTP মেয়াদ শেষ হয়ে গেছে',
      invalidOtp: 'অবৈধ OTP',
    },
    ride: {
      requestRide: 'রাইড অনুরোধ করুন',
      findingPool: 'পুল খুঁজছে...',
      waitingForDriver: 'ড্রাইভারের জন্য অপেক্ষা',
      driverAssigned: 'ড্রাইভার নির্ধারিত',
      rideStarted: 'রাইড শুরু হয়েছে',
      rideCompleted: 'রাইড সম্পন্ন',
      rideCancelled: 'রাইড বাতিল',
      pickup: 'পিকআপ',
      dropoff: 'ড্রপ-অফ',
      destination: 'গন্তব্য',
      estimatedFare: 'আনুমানিক ভাড়া',
      estimatedTime: 'আনুমানিক সময়',
      distance: 'দূরত্ব',
      passengers: 'যাত্রী',
      poolSize: 'পুলের আকার',
      savings: 'আপনার সঞ্চয়',
      cancelRide: 'রাইড বাতিল করুন',
      confirmCancel: 'আপনি কি নিশ্চিত বাতিল করতে চান?',
      cancelWarning: 'বাতিল ফি প্রযোজ্য হতে পারে',
      lookupTime: 'আরো যাত্রী খুঁজছে',
      lookupTimeRemaining: 'অবশিষ্ট সময়',
      noPoolsFound: 'কোন মিলিত পুল পাওয়া যায়নি',
      createNewPool: 'নতুন পুল তৈরি করুন',
      joinPool: 'পুলে যোগ দিন',
      leavePool: 'পুল ছেড়ে দিন',
    },
    driver: {
      goOnline: 'অনলাইন হন',
      goOffline: 'অফলাইন হন',
      online: 'অনলাইন',
      offline: 'অফলাইন',
      busy: 'ব্যস্ত',
      acceptRide: 'রাইড গ্রহণ করুন',
      rejectRide: 'রাইড বাতিল করুন',
      startRide: 'রাইড শুরু করুন',
      completeRide: 'রাইড সম্পন্ন করুন',
      pickupPassenger: 'যাত্রী তুলুন',
      dropoffPassenger: 'যাত্রী নামান',
      navigation: 'নেভিগেশন',
      earnings: 'আয়',
      todayEarnings: 'আজকের আয়',
      weeklyEarnings: 'সাপ্তাহিক আয়',
      trips: 'ট্রিপ',
      rating: 'রেটিং',
      heatmap: 'চাহিদা হিটম্যাপ',
      surgeZone: 'সার্জ জোন',
      highDemand: 'উচ্চ চাহিদা এলাকা',
      priorityLocation: 'অগ্রাধিকার গন্তব্য',
      setPriority: 'অগ্রাধিকার স্থান সেট করুন',
      clearPriority: 'অগ্রাধিকার মুছুন',
    },
    pool: {
      poolFound: 'পুল পাওয়া গেছে!',
      waitingForRiders: 'আরো যাত্রীর জন্য অপেক্ষা',
      poolReady: 'পুল প্রস্তুত',
      poolStarted: 'পুল শুরু হয়েছে',
      poolCompleted: 'পুল সম্পন্ন',
      coPassengers: 'সহ-যাত্রী',
      femaleOnly: 'শুধু মহিলা',
      anyGender: 'সকল লিঙ্গ',
      vehicleType: 'গাড়ির ধরন',
      car: 'গাড়ি',
      cng: 'সিএনজি',
      maxPassengers: 'সর্বোচ্চ যাত্রী',
    },
    payment: {
      payment: 'পেমেন্ট',
      payNow: 'এখন পে করুন',
      wallet: 'ওয়ালেট',
      walletBalance: 'ওয়ালেট ব্যালেন্স',
      addMoney: 'টাকা যোগ করুন',
      paymentMethod: 'পেমেন্ট পদ্ধতি',
      cash: 'নগদ',
      card: 'কার্ড',
      mobileBanking: 'মোবাইল ব্যাংকিং',
      bkash: 'বিকাশ',
      nagad: 'নগদ',
      transactionHistory: 'লেনদেনের ইতিহাস',
      paymentSuccessful: 'পেমেন্ট সফল',
      paymentFailed: 'পেমেন্ট ব্যর্থ',
      insufficientBalance: 'অপর্যাপ্ত ব্যালেন্স',
      promoCode: 'প্রোমো কোড',
      applyPromo: 'প্রোমো প্রয়োগ করুন',
      promoApplied: 'প্রোমো প্রয়োগ হয়েছে',
      invalidPromo: 'অবৈধ প্রোমো কোড',
    },
    safety: {
      sos: 'জরুরি সাহায্য',
      emergency: 'জরুরি অবস্থা',
      shareRide: 'রাইড শেয়ার করুন',
      rideShared: 'রাইড সফলভাবে শেয়ার হয়েছে',
      emergencyContacts: 'জরুরি যোগাযোগ',
      addContact: 'যোগাযোগ যোগ করুন',
      callPolice: 'পুলিশ কল করুন',
      reportIssue: 'সমস্যা রিপোর্ট করুন',
      feelingUnsafe: 'অনিরাপদ মনে হচ্ছে?',
      sosActivated: 'জরুরি সাহায্য সক্রিয় - সাহায্য আসছে',
    },
    rating: {
      rateRide: 'রাইড রেট করুন',
      rateDriver: 'ড্রাইভার রেট করুন',
      ratePassenger: 'যাত্রী রেট করুন',
      howWasRide: 'রাইড কেমন ছিল?',
      leaveComment: 'মন্তব্য করুন (ঐচ্ছিক)',
      thankYou: 'আপনার মতামতের জন্য ধন্যবাদ!',
      stars: 'তারা',
    },
    notification: {
      notifications: 'বিজ্ঞপ্তি',
      noNotifications: 'কোন বিজ্ঞপ্তি নেই',
      markAllRead: 'সব পড়া হিসেবে চিহ্নিত করুন',
      poolMatch: 'পুল মিল পাওয়া গেছে',
      driverArriving: 'ড্রাইভার আসছে',
      rideReminder: 'রাইড রিমাইন্ডার',
      paymentReminder: 'পেমেন্ট রিমাইন্ডার',
      promoAvailable: 'নতুন প্রোমো উপলব্ধ',
    },
    settings: {
      settings: 'সেটিংস',
      profile: 'প্রোফাইল',
      language: 'ভাষা',
      english: 'English',
      bangla: 'বাংলা',
      notifications: 'বিজ্ঞপ্তি',
      privacy: 'গোপনীয়তা',
      help: 'সাহায্য ও সহায়তা',
      about: 'সম্পর্কে',
      terms: 'সেবার শর্তাবলী',
      privacyPolicy: 'গোপনীয়তা নীতি',
      deleteAccount: 'অ্যাকাউন্ট মুছুন',
      version: 'সংস্করণ',
    },
    errors: {
      networkError: 'নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করুন।',
      serverError: 'সার্ভার ত্রুটি। পরে আবার চেষ্টা করুন।',
      unauthorized: 'চালিয়ে যেতে লগইন করুন',
      notFound: 'পাওয়া যায়নি',
      invalidInput: 'অবৈধ ইনপুট',
      somethingWrong: 'কিছু ভুল হয়েছে',
      tryAgain: 'আবার চেষ্টা করুন',
      sessionExpired: 'সেশন শেষ। আবার লগইন করুন।',
    },
    units: {
      km: 'কিমি',
      mins: 'মিনিট',
      hours: 'ঘন্টা',
      bdt: '৳',
      taka: 'টাকা',
    },
  },
};

export class I18nService {
  private defaultLanguage: SupportedLanguage = 'en';

  translate(key: string, language: SupportedLanguage = this.defaultLanguage): string {
    try {
      const keys = key.split('.');
      let result: any = translations[language];

      for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
          result = result[k];
        } else {
          result = translations[this.defaultLanguage];
          for (const fallbackKey of keys) {
            if (result && typeof result === 'object' && fallbackKey in result) {
              result = result[fallbackKey];
            } else {
              return key;
            }
          }
          break;
        }
      }

      return typeof result === 'string' ? result : key;
    } catch (error) {
      logger.error('[I18nService] translate error:', error);
      return key;
    }
  }

  t(key: string, language?: SupportedLanguage): string {
    return this.translate(key, language);
  }

  translateWithParams(
    key: string,
    params: Record<string, string | number>,
    language: SupportedLanguage = this.defaultLanguage
  ): string {
    let translated = this.translate(key, language);

    Object.entries(params).forEach(([param, value]) => {
      translated = translated.replace(new RegExp(`{{${param}}}`, 'g'), String(value));
    });

    return translated;
  }

  getAvailableLanguages(): { code: SupportedLanguage; name: string; nativeName: string }[] {
    return [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
    ];
  }

  isValidLanguage(code: string): code is SupportedLanguage {
    return code === 'en' || code === 'bn';
  }

  getTranslationsForSection(
    section: string,
    language: SupportedLanguage = this.defaultLanguage
  ): Record<string, string> {
    const sectionTranslations = translations[language][section];
    if (typeof sectionTranslations === 'object') {
      return sectionTranslations as Record<string, string>;
    }
    return {};
  }

  getAllTranslations(language: SupportedLanguage = this.defaultLanguage): TranslationKey {
    return translations[language];
  }

  formatCurrency(amount: number, language: SupportedLanguage = this.defaultLanguage): string {
    const symbol = this.translate('units.bdt', language);
    return `${symbol}${amount.toFixed(0)}`;
  }

  formatDistance(km: number, language: SupportedLanguage = this.defaultLanguage): string {
    const unit = this.translate('units.km', language);
    return `${km.toFixed(1)} ${unit}`;
  }

  formatDuration(minutes: number, language: SupportedLanguage = this.defaultLanguage): string {
    if (minutes < 60) {
      const unit = this.translate('units.mins', language);
      return `${Math.round(minutes)} ${unit}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    const hourUnit = this.translate('units.hours', language);
    const minUnit = this.translate('units.mins', language);
    return mins > 0 ? `${hours} ${hourUnit} ${mins} ${minUnit}` : `${hours} ${hourUnit}`;
  }

  getLocalizedErrorMessage(errorCode: string, language: SupportedLanguage = this.defaultLanguage): string {
    const errorKey = `errors.${errorCode.toLowerCase()}`;
    const translation = this.translate(errorKey, language);
    return translation !== errorKey ? translation : this.translate('errors.somethingWrong', language);
  }
}

export const i18nService = new I18nService();

export function createI18nMiddleware() {
  return (req: any, res: any, next: any) => {
    const acceptLanguage = req.headers['accept-language'] || 'en';
    const preferredLanguage = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
    
    req.language = i18nService.isValidLanguage(preferredLanguage) ? preferredLanguage : 'en';
    req.t = (key: string, params?: Record<string, string | number>) => {
      if (params) {
        return i18nService.translateWithParams(key, params, req.language);
      }
      return i18nService.translate(key, req.language);
    };
    
    next();
  };
}
