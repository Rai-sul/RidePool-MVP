// Native-compatible icon exports using lucide-react-native
import * as LucideIcons from 'lucide-react-native';
import React from 'react';
import { Text } from 'react-native';

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

// Create wrapper components that match lucide-react-native API
const createIcon = (IconComponent: any) => {
  return ({ color = 'currentColor', size, strokeWidth = 2, ...props }: IconProps) => (
    <IconComponent 
      color={color} 
      strokeWidth={strokeWidth}
      {...(size !== undefined && { size })}
      {...props}
    />
  );
};

export const Car = createIcon(LucideIcons.Car);
export const MapPin = createIcon(LucideIcons.MapPin);
export const Receipt = createIcon(LucideIcons.Receipt);
export const Wallet = createIcon(LucideIcons.Wallet);
export const User = createIcon(LucideIcons.User);
export const Users = createIcon(LucideIcons.Users);
export const Home = createIcon(LucideIcons.Home);
export const Briefcase = createIcon(LucideIcons.Briefcase);
export const Dumbbell = createIcon(LucideIcons.Dumbbell);
export const Plane = createIcon(LucideIcons.Plane);
export const Search = createIcon(LucideIcons.Search);
export const Tag = createIcon(LucideIcons.Tag);
export const ArrowRight = createIcon(LucideIcons.ArrowRight);
export const Star = createIcon(LucideIcons.Star);
export const ChevronRight = createIcon(LucideIcons.ChevronRight);
export const ChevronLeft = createIcon(LucideIcons.ChevronLeft);
export const X = createIcon(LucideIcons.X);
export const MapPinned = createIcon(LucideIcons.MapPinned);
export const Clock = createIcon(LucideIcons.Clock);
export const Phone = createIcon(LucideIcons.Phone);
export const MessageSquare = createIcon(LucideIcons.MessageSquare);
export const AlertCircle = createIcon(LucideIcons.AlertCircle);
export const Check = createIcon(LucideIcons.Check);
export const Circle = createIcon(LucideIcons.Circle);
export const Navigation = createIcon(LucideIcons.Navigation);
export const CreditCard = createIcon(LucideIcons.CreditCard);
export const Plus = createIcon(LucideIcons.Plus);
export const Gift = createIcon(LucideIcons.Gift);
export const History = createIcon(LucideIcons.History);
export const Settings = createIcon(LucideIcons.Settings);
export const Bell = createIcon(LucideIcons.Bell);
export const Globe = createIcon(LucideIcons.Globe);
export const Shield = createIcon(LucideIcons.Shield);
export const HelpCircle = createIcon(LucideIcons.HelpCircle);
export const Share2 = createIcon(LucideIcons.Share2);
export const UserPlus = createIcon(LucideIcons.UserPlus);
export const Award = createIcon(LucideIcons.Award);
export const TrendingUp = createIcon(LucideIcons.TrendingUp);
export const Calendar = createIcon(LucideIcons.Calendar);
export const Edit = createIcon(LucideIcons.Edit);
export const Trash2 = createIcon(LucideIcons.Trash2);
export const Eye = createIcon(LucideIcons.Eye);
export const EyeOff = createIcon(LucideIcons.EyeOff);
export const LogOut = createIcon(LucideIcons.LogOut);
export const Camera = createIcon(LucideIcons.Camera);
export const Mail = createIcon(LucideIcons.Mail);
export const Lock = createIcon(LucideIcons.Lock);
export const ArrowLeft = createIcon(LucideIcons.ArrowLeft);
export const Minus = createIcon(LucideIcons.Minus);
export const Download = createIcon(LucideIcons.Download);
export const Upload = createIcon(LucideIcons.Upload);
export const Info = createIcon(LucideIcons.Info);
export const ThumbsUp = createIcon(LucideIcons.ThumbsUp);
export const ThumbsDown = createIcon(LucideIcons.ThumbsDown);
export const Heart = createIcon(LucideIcons.Heart);
export const Filter = createIcon(LucideIcons.Filter);
export const SlidersHorizontal = createIcon(LucideIcons.SlidersHorizontal);
export const MoreVertical = createIcon(LucideIcons.MoreVertical);
export const MoreHorizontal = createIcon(LucideIcons.MoreHorizontal);
export const DollarSign = createIcon(LucideIcons.DollarSign);

// Custom Taka icon (৳)
export const Taka = ({ className, ...props }: { className?: string; [key: string]: any }) => {
  const sizeMatch = className?.match(/w-(\d+)/);
  const size = sizeMatch ? parseInt(sizeMatch[1]) * 4 : 20;
  
  return (
    <Text style={{ fontSize: size, lineHeight: size }} {...props} className={className}>
      ৳
    </Text>
  );
};
export const Smartphone = createIcon(LucideIcons.Smartphone);
export const Building = createIcon(LucideIcons.Building);
export const MessageCircle = createIcon(LucideIcons.MessageCircle);
export const FileText = createIcon(LucideIcons.FileText);
export const RefreshCw = createIcon(LucideIcons.RefreshCw);
export const Send = createIcon(LucideIcons.Send);
export const Smile = createIcon(LucideIcons.Smile);
export const Paperclip = createIcon(LucideIcons.Paperclip);
export const Video = createIcon(LucideIcons.Video);
export const Copy = createIcon(LucideIcons.Copy);
export const Volume2 = createIcon(LucideIcons.Volume2);
export const Vibrate = createIcon(LucideIcons.Vibrate);
export const Moon = createIcon(LucideIcons.Moon);
export const Wifi = createIcon(LucideIcons.Wifi);
export const Bot = createIcon(LucideIcons.Bot);
export const Route = createIcon(LucideIcons.Route);