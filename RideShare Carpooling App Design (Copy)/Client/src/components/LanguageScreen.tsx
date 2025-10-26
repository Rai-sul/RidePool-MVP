import { ArrowLeft, Check } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';

type LanguageScreenProps = {
  onBack: () => void;
};

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
];

export default function LanguageScreen({ onBack }: LanguageScreenProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  return (
    <div className="h-full w-full bg-gray-50 flex flex-col pb-20 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl">Language</h1>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div className="bg-white rounded-2xl overflow-hidden">
          {languages.map((language) => (
            <div
              key={language.code}
              onClick={() => setSelectedLanguage(language.code)}
              className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer active:bg-gray-100"
            >
              <div>
                <p>{language.name}</p>
                <p className="text-sm text-gray-500">{language.nativeName}</p>
              </div>
              {selectedLanguage === language.code && (
                <Check className="w-5 h-5 text-blue-600" />
              )}
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-900">
            The app will restart to apply the new language setting.
          </p>
        </div>
      </div>
    </div>
  );
}
