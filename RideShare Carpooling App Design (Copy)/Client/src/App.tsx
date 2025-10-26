import { useState } from "react";
import WelcomeScreen from "./components/WelcomeScreen";
import ProfileSetup from "./components/ProfileSetup";
import LandingPage from "./components/LandingPage";
import HomeMap from "./components/HomeMap";
import RideConfirmation from "./components/RideConfirmation";
import SearchingDriver from "./components/SearchingDriver";
import DriverMatched from "./components/DriverMatched";
import ActiveRide from "./components/ActiveRide";
import PaymentSummary from "./components/PaymentSummary";
import RateReview from "./components/RateReview";
import TripsScreen from "./components/TripsScreen";
import WalletScreen from "./components/WalletScreen";
import ProfileScreen from "./components/ProfileScreen";
import PersonalInfo from "./components/PersonalInfo";
import SavedPlaces from "./components/SavedPlaces";
import YourRatings from "./components/YourRatings";
import SettingsScreen from "./components/SettingsScreen";
import NotificationsScreen from "./components/NotificationsScreen";
import LanguageScreen from "./components/LanguageScreen";
import GenderPreference from "./components/GenderPreference";
import SafetyCenter from "./components/SafetyCenter";
import HelpSupport from "./components/HelpSupport";
import PaymentMethods from "./components/PaymentMethods";
import PromoCode from "./components/PromoCode";
import AllTransactions from "./components/AllTransactions";
import AddMoney from "./components/AddMoney";
import FriendsScreen from "./components/FriendsScreen";
import BottomNav from "./components/BottomNav";

export type UserProfile = {
  firstName: string;
  lastName: string;
  email: string;
  gender: "male" | "female";
};

export type Pool = {
  id: string;
  driverName: string;
  seatsLeft: number;
  savings: number;
  eta: number;
  walkDistance: number;
  rating: number;
  carModel: string;
  licensePlate: string;
  photo: string;
};

export type Destination = {
  name: string;
  address: string;
};

export default function App() {
  const [screen, setScreen] = useState<
    | "welcome"
    | "profile-setup"
    | "home"
    | "ride-confirmation"
    | "searching"
    | "driver-matched"
    | "active-ride"
    | "payment"
    | "rate-review"
    | "trips"
    | "wallet"
    | "profile"
    | "friends"
    | "personal-info"
    | "saved-places"
    | "your-ratings"
    | "settings"
    | "notifications"
    | "language"
    | "gender-preference"
    | "safety-center"
    | "help-support"
    | "payment-methods"
    | "promo-code"
    | "all-transactions"
    | "add-money"
  >("welcome");
  const [activeTab, setActiveTab] = useState<
    "home" | "trips" | "wallet" | "profile" | "friends"
  >("home");
  const [userProfile, setUserProfile] =
    useState<UserProfile | null>(null);
  const [selectedDestination, setSelectedDestination] =
    useState<Destination | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(
    null,
  );
  const [showRateReview, setShowRateReview] = useState(false);
  const [selectedRideType, setSelectedRideType] = useState<'female-only' | 'regular' | null>(null);

  const handleSignUp = () => {
    setScreen("profile-setup");
  };

  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setScreen("home");
  };

  const handleDestinationSelect = (
    destination: Destination,
    rideType?: 'female-only' | 'regular'
  ) => {
    setSelectedDestination(destination);
    setSelectedRideType(rideType || null);
    setScreen("ride-confirmation");
  };

  const handlePoolSelect = (pool: Pool) => {
    setSelectedPool(pool);
    setScreen("searching");

    // Simulate matching
    setTimeout(() => {
      setScreen("driver-matched");
    }, 3000);
  };

  const handleStartRide = () => {
    setScreen("active-ride");
  };

  const handleCompleteRide = () => {
    setScreen("payment");
  };

  const handlePaymentDone = () => {
    setShowRateReview(true);
  };

  const handleRatingComplete = () => {
    setShowRateReview(false);
    setScreen("home");
    setActiveTab("home");
    setSelectedDestination(null);
    setSelectedPool(null);
  };

  const handleTabChange = (
    tab: "home" | "trips" | "wallet" | "profile" | "friends",
  ) => {
    setActiveTab(tab);
    if (tab === "home") {
      setScreen("home");
    } else if (tab === "trips") {
      setScreen("trips");
    } else if (tab === "wallet") {
      setScreen("wallet");
    } else if (tab === "profile") {
      setScreen("profile");
    } else if (tab === "friends") {
      setScreen("friends");
    }
  };

  const handleBackToHome = () => {
    setScreen("home");
    setActiveTab("home");
    setSelectedDestination(null);
    setSelectedPool(null);
  };

  const handleCancelSearch = () => {
    setScreen("ride-confirmation");
  };

  const handleProfileClick = () => {
    setScreen("profile");
    setActiveTab("profile");
  };

  const handleMenuItemClick = (item: string) => {
    switch (item) {
      case "Personal Info":
        setScreen("personal-info");
        break;
      case "Saved Places":
        setScreen("saved-places");
        break;
      case "Your Ratings":
        setScreen("your-ratings");
        break;
      case "Settings":
        setScreen("settings");
        break;
      case "Notifications":
        setScreen("notifications");
        break;
      case "Language":
        setScreen("language");
        break;
      case "Gender Preference":
        setScreen("gender-preference");
        break;
      case "Safety Center":
        setScreen("safety-center");
        break;
      case "Help & Support":
        setScreen("help-support");
        break;
      default:
        break;
    }
  };

  const handleBackToProfile = () => {
    setScreen("profile");
  };

  const handleWalletNavigate = (page: string) => {
    switch (page) {
      case "payment-methods":
        setScreen("payment-methods");
        break;
      case "promo-code":
        setScreen("promo-code");
        break;
      case "all-transactions":
        setScreen("all-transactions");
        break;
      case "add-money":
        setScreen("add-money");
        break;
      default:
        break;
    }
  };

  const handleBackToWallet = () => {
    setScreen("wallet");
    setActiveTab("wallet");
  };

  // Render appropriate screen
  const renderMainScreen = () => {
    if (screen === "welcome") {
      return <WelcomeScreen onSignUp={handleSignUp} />;
    }

    if (screen === "profile-setup") {
      return (
        <ProfileSetup onComplete={handleProfileComplete} />
      );
    }

    if (screen === "home") {
      return (
        <LandingPage
          userProfile={userProfile}
          onDestinationSelect={handleDestinationSelect}
          onProfileClick={handleProfileClick}
        />
      );
    }

    if (screen === "ride-confirmation") {
      return (
        <RideConfirmation
          destination={selectedDestination}
          userProfile={userProfile}
          rideType={selectedRideType}
          onPoolSelect={handlePoolSelect}
          onBack={handleBackToHome}
        />
      );
    }

    if (screen === "searching") {
      return <SearchingDriver onCancel={handleCancelSearch} />;
    }

    if (screen === "driver-matched") {
      return (
        <DriverMatched
          pool={selectedPool}
          onStartRide={handleStartRide}
        />
      );
    }

    if (screen === "active-ride") {
      return (
        <ActiveRide
          pool={selectedPool}
          destination={selectedDestination}
          onComplete={handleCompleteRide}
        />
      );
    }

    if (screen === "payment") {
      return (
        <PaymentSummary
          destination={selectedDestination}
          userProfile={userProfile}
          onDone={handlePaymentDone}
        />
      );
    }

    if (screen === "trips") {
      return (
        <TripsScreen
          userProfile={userProfile}
          onBookRide={handleBackToHome}
        />
      );
    }

    if (screen === "wallet") {
      return (
        <WalletScreen
          userProfile={userProfile}
          onNavigate={handleWalletNavigate}
        />
      );
    }

    if (screen === "payment-methods") {
      return <PaymentMethods onBack={handleBackToWallet} />;
    }

    if (screen === "promo-code") {
      return <PromoCode onBack={handleBackToWallet} />;
    }

    if (screen === "all-transactions") {
      return <AllTransactions onBack={handleBackToWallet} />;
    }

    if (screen === "add-money") {
      return <AddMoney onBack={handleBackToWallet} />;
    }

    if (screen === "profile") {
      return (
        <ProfileScreen
          userProfile={userProfile}
          onMenuItemClick={handleMenuItemClick}
        />
      );
    }

    if (screen === "friends") {
      return <FriendsScreen userProfile={userProfile} />;
    }

    if (screen === "personal-info") {
      return (
        <PersonalInfo
          userProfile={userProfile}
          onBack={handleBackToProfile}
        />
      );
    }

    if (screen === "saved-places") {
      return <SavedPlaces onBack={handleBackToProfile} />;
    }

    if (screen === "your-ratings") {
      return <YourRatings onBack={handleBackToProfile} />;
    }

    if (screen === "settings") {
      return <SettingsScreen onBack={handleBackToProfile} />;
    }

    if (screen === "notifications") {
      return (
        <NotificationsScreen onBack={handleBackToProfile} />
      );
    }

    if (screen === "language") {
      return <LanguageScreen onBack={handleBackToProfile} />;
    }

    if (screen === "gender-preference") {
      return (
        <GenderPreference
          userProfile={userProfile}
          onBack={handleBackToProfile}
        />
      );
    }

    if (screen === "safety-center") {
      return <SafetyCenter onBack={handleBackToProfile} />;
    }

    if (screen === "help-support") {
      return <HelpSupport onBack={handleBackToProfile} />;
    }

    return null;
  };

  const showBottomNav =
    screen !== "welcome" &&
    screen !== "profile-setup" &&
    screen !== "searching" &&
    screen !== "driver-matched" &&
    screen !== "active-ride" &&
    screen !== "payment" &&
    screen !== "personal-info" &&
    screen !== "saved-places" &&
    screen !== "your-ratings" &&
    screen !== "settings" &&
    screen !== "notifications" &&
    screen !== "language" &&
    screen !== "gender-preference" &&
    screen !== "safety-center" &&
    screen !== "help-support" &&
    screen !== "payment-methods" &&
    screen !== "promo-code" &&
    screen !== "all-transactions" &&
    screen !== "add-money";

  return (
    <div className="relative h-screen w-full max-w-md mx-auto bg-white overflow-hidden">
      {renderMainScreen()}

      {showBottomNav && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isFemale={userProfile?.gender === "female"}
        />
      )}

      {showRateReview && (
        <RateReview
          pool={selectedPool}
          userProfile={userProfile}
          onComplete={handleRatingComplete}
        />
      )}
    </div>
  );
}