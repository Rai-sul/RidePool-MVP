import { useRouter } from 'expo-router';
import { ContactInfoScreen } from '../src/components/screens/ContactInfoScreen.native';
import type { ContactInfoData } from '../src/components/screens/ContactInfoScreen.native';

export default function ContactInfo() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleSave = (data: ContactInfoData) => {
    console.log('Saving contact info:', data);
    // TODO: Save to backend/storage
    router.back();
  };

  return <ContactInfoScreen onBack={handleBack} onSave={handleSave} />;
}
