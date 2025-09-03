"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { 
  Plus, 
  Calculator, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  LineChart, 
  Activity, 
  Eye, 
  Play, 
  Brain, 
  Zap, 
  Clock, 
  DollarSign, 
  Percent, 
  Calendar,
  ArrowRight,
  Settings,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  Star,
  Award,
  Trophy,
  Rocket,
  Shield,
  Heart,
  Sparkles,
  Gift,
  PartyPopper,
  Confetti,
  Fire,
  Crown,
  Diamond,
  Rainbow,
  Sun,
  Moon,
  Sparkle,
  Magic,
  Wand2,
  Gamepad2,
  Target as TargetIcon,
  Flag,
  Medal,
  Badge,
  Gem,
  Coins,
  Banknote,
  PiggyBank,
  Wallet,
  CreditCard,
  Home,
  Car,
  GraduationCap,
  Briefcase,
  ShoppingBag,
  Plane,
  Camera,
  Music,
  Gamepad,
  BookOpen,
  Dumbbell,
  Utensils,
  Coffee,
  Wine,
  ShoppingCart,
  Smartphone,
  Laptop,
  Headphones,
  Watch,
  Glasses,
  Shirt,
  Shoe,
  Bag,
  Key,
  Lock,
  Unlock,
  Bell,
  Mail,
  Phone,
  MessageCircle,
  ThumbsUp,
  Heart as HeartIcon,
  Smile,
  Laugh,
  Wink,
  Hug,
  Kiss,
  Clap,
  Wave,
  Peace,
  Victory,
  Fist,
  Point,
  Hand,
  Fingerprint,
  User,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  UserMinus,
  UserCog,
  UserEdit,
  UserSearch,
  UserShield,
  UserStar,
  UserHeart,
  UserSmile,
  UserCheck2,
  UserPlus2,
  UserMinus2,
  UserX2,
  UserCog2,
  UserEdit2,
  UserSearch2,
  UserShield2,
  UserStar2,
  UserHeart2,
  UserSmile2
} from "lucide-react";
import { Modal } from "../../../components/Modal";
import { LoanEngine, UltraSimpleLiabilityInput, EnhancedLoanStatus } from "../../domain/Repaymentadvisor/repaymentEngine";
import SmartLiabilityCapture from "./components/SmartLiabilityCapture";
import { formatCurrency, formatPercentage } from "@/lib/smartRepayments";

export default function RepaymentsPage() {
  const [liabilities, setLiabilities] = useState<UltraSimpleLiabilityInput[]>([]);
  const [liabilityStatuses, setLiabilityStatuses] = useState<EnhancedLoanStatus[]>([]);
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [selectedView, setSelectedView] = useState<'dashboard' | 'journey' | 'celebrate' | 'insights'>('dashboard');
  const [engine] = useState(new LoanEngine());
  const [celebrationMode, setCelebrationMode] = useState(false);

  // Calculate liability statuses when liabilities change
  useEffect(() => {
    const statuses = liabilities.map(liability => 
      engine.calculateEverything(liability)
    );
    setLiabilityStatuses(statuses);
  }, [liabilities, engine]);

  const handleSaveLiability = (liability: UltraSimpleLiabilityInput) => {
    setLiabilities(prev => [...prev, liability]);
    setShowCaptureModal(false);
    // Trigger celebration for first liability
    if (liabilities.length === 0) {
      setCelebrationMode(true);
      setTimeout(() => setCelebrationMode(false), 3000);
    }
  };

  const handleDeleteLiability = (index: number) => {
    setLiabilities(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotalDebt = () => {
    return liabilityStatuses.reduce((sum, status) => sum + status.outstandingBalance, 0);
  };

  const calculateTotalEMI = () => {
    return liabilityStatuses.reduce((sum, status) => sum + status.emi, 0);
  };

  const calculateTotalInterest = () => {
    return liabilityStatuses.reduce((sum, status) => 
      sum + (status.totalInterestPaid || 0) + (status.totalInterestAccrued || 0), 0
    );
  };

  const calculateDebtHealthScore = () => {
    if (liabilityStatuses.length === 0) return 0;
    
    let score = 100;
    const avgInterestRate = liabilityStatuses.reduce((sum, status) => {
      const liability = liabilities.find(l => l.type === status.loanCategory);
      return sum + (liability?.interest_rate || 0);
    }, 0) / liabilityStatuses.length;
    
    if (avgInterestRate > 20) score -= 30;
    else if (avgInterestRate > 15) score -= 20;
    else if (avgInterestRate > 10) score -= 10;
    
    const highRiskCount = liabilityStatuses.filter(status => 
      status.loanCategory === 'credit_card' || status.loanCategory === 'gold_loan'
    ).length;
    score -= highRiskCount * 15;
    
    return Math.max(0, Math.min(100, score));
  };

  const getDebtHealthEmoji = (score: number) => {
    if (score >= 90) return "🏆";
    if (score >= 80) return "🥇";
    if (score >= 70) return "🥈";
    if (score >= 60) return "🥉";
    if (score >= 50) return "👍";
    if (score >= 40) return "⚠️";
    return "🚨";
  };

  const getDebtHealthMessage = (score: number) => {
    if (score >= 90) return "Outstanding! You're a debt management champion! 🎉";
    if (score >= 80) return "Excellent! You're doing great! 🌟";
    if (score >= 70) return "Good job! Keep up the momentum! 💪";
    if (score >= 60) return "You're on the right track! 🎯";
    if (score >= 50) return "Room for improvement, but you've got this! 💡";
    if (score >= 40) return "Let's work together to improve this! 🤝";
    return "Don't worry, we'll help you turn this around! 🚀";
  };

  const getDebtHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getDebtHealthGradient = (score: number) => {
    if (score >= 80) return 'from-green-400 to-emerald-500';
    if (score >= 60) return 'from-yellow-400 to-orange-500';
    if (score >= 40) return 'from-orange-400 to-red-500';
    return 'from-red-400 to-pink-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
      {/* Celebration Overlay */}
      {celebrationMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-8xl mb-4 animate-bounce">🎉</div>
            <h2 className="text-3xl font-bold text-white mb-2">Welcome to Your Debt-Free Journey!</h2>
            <p className="text-white/80">Let's make this exciting! 🚀</p>
          </div>
        </div>
      )}

      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Your Debt-Free Journey
            </h1>
            <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Transform your debt into your greatest financial victory! 🏆
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 rounded-2xl shadow-lg">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3, emoji: '📊' },
              { id: 'journey', label: 'Journey', icon: Flag, emoji: '🗺️' },
              { id: 'celebrate', label: 'Celebrate', icon: PartyPopper, emoji: '🎉' },
              { id: 'insights', label: 'Insights', icon: Brain, emoji: '🧠' }
            ].map(({ id, label, icon: Icon, emoji }) => (
              <button
                key={id}
                onClick={() => setSelectedView(id as any)}
                className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                  selectedView === id
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transform scale-105'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
              >
                <span className="text-lg">{emoji}</span>
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {liabilities.length > 0 ? (
          <>
            {/* Debt Health Score - Hero Section */}
            <Card className="border-0 shadow-2xl bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <div className="flex items-center justify-center space-x-4">
                    <div className={`text-8xl animate-pulse`}>
                      {getDebtHealthEmoji(calculateDebtHealthScore())}
                    </div>
                    <div>
                      <h2 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
                        Your Financial Health
                      </h2>
                      <div className={`text-6xl font-bold ${getDebtHealthColor(calculateDebtHealthScore())}`}>
                        {calculateDebtHealthScore()}/100
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xl text-gray-600 dark:text-gray-300">
                    {getDebtHealthMessage(calculateDebtHealthScore())}
                  </p>
                  
                  {/* Key Metrics with Emojis */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center p-6 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/20 dark:to-pink-900/20 rounded-2xl">
                      <div className="text-4xl mb-2">💸</div>
                      <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(calculateTotalDebt())}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Total Debt</p>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl">
                      <div className="text-4xl mb-2">📅</div>
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(calculateTotalEMI())}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Monthly EMIs</p>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-2xl">
                      <div className="text-4xl mb-2">📈</div>
                      <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(calculateTotalInterest())}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Total Interest</p>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl">
                      <div className="text-4xl mb-2">🎯</div>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {formatPercentage(liabilities.length > 0 ? 
                          liabilities.reduce((sum, l) => sum + l.interest_rate, 0) / liabilities.length : 0)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Avg Interest</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* View Content */}
            {selectedView === 'dashboard' && (
              <div className="space-y-8">
                {/* Quick Actions */}
                <Card className="border-0 shadow-xl bg-gradient-to-r from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/20">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-center space-x-2 text-2xl">
                      <span className="text-3xl">⚡</span>
                      <span>Quick Actions</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <Button 
                        variant="outline" 
                        className="h-24 flex-col space-y-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-blue-200 dark:hover:from-blue-800/30 dark:hover:to-blue-700/30"
                      >
                        <span className="text-2xl">🧮</span>
                        <span>Prepayment Calculator</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-24 flex-col space-y-2 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800 hover:from-green-100 hover:to-green-200 dark:hover:from-green-800/30 dark:hover:to-green-700/30"
                      >
                        <span className="text-2xl">🎯</span>
                        <span>Payoff Strategy</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-24 flex-col space-y-2 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-purple-200 dark:hover:from-purple-800/30 dark:hover:to-purple-700/30"
                      >
                        <span className="text-2xl">📈</span>
                        <span>Refinance Check</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-24 flex-col space-y-2 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800 hover:from-yellow-100 hover:to-yellow-200 dark:hover:from-yellow-800/30 dark:hover:to-yellow-700/30"
                      >
                        <span className="text-2xl">💡</span>
                        <span>Smart Tips</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Liabilities Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {liabilityStatuses.map((status, index) => (
                    <LiabilityCard
                      key={index}
                      liability={liabilities[index]}
                      status={status}
                      onDelete={() => handleDeleteLiability(index)}
                    />
                  ))}
                </div>
              </div>
            )}

            {selectedView === 'journey' && (
              <JourneyView liabilities={liabilities} liabilityStatuses={liabilityStatuses} />
            )}

            {selectedView === 'celebrate' && (
              <CelebrationView liabilities={liabilities} liabilityStatuses={liabilityStatuses} />
            )}

            {selectedView === 'insights' && (
              <InsightsView liabilities={liabilities} liabilityStatuses={liabilityStatuses} />
            )}
          </>
        ) : (
          <Card className="border-0 shadow-2xl bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20">
            <CardContent className="p-16 text-center">
              <div className="space-y-8">
                <div className="text-8xl animate-bounce">🚀</div>
                <h3 className="text-4xl font-bold text-gray-800 dark:text-white">
                  Ready to Start Your Debt-Free Journey?
                </h3>
                <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                  Let's turn your debt into your greatest financial victory! Add your first liability and watch the magic happen! ✨
                </p>
                <Button 
                  size="lg"
                  onClick={() => setShowCaptureModal(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-4 text-lg rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  <span className="text-2xl mr-3">🎯</span>
                  Start Your Journey
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Floating Add Button */}
        <div className="fixed bottom-8 right-8">
          <Button
            size="lg"
            onClick={() => setShowCaptureModal(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full w-16 h-16 shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300"
          >
            <Plus className="w-8 h-8" />
          </Button>
        </div>

        {/* Smart Liability Capture Modal */}
        <Modal
          open={showCaptureModal}
          onClose={() => setShowCaptureModal(false)}
          title="Add Your Liability"
        >
          <SmartLiabilityCapture
            onSave={handleSaveLiability}
            onCancel={() => setShowCaptureModal(false)}
          />
        </Modal>
      </div>
    </div>
  );
}

// Liability Card Component
function LiabilityCard({ 
  liability, 
  status, 
  onDelete 
}: { 
  liability: UltraSimpleLiabilityInput, 
  status: EnhancedLoanStatus, 
  onDelete: () => void 
}) {
  const [showDetails, setShowDetails] = useState(false);
  
  const getEmoji = () => {
    switch (liability.type) {
      case 'home_loan': return '🏠';
      case 'car_loan': return '🚗';
      case 'credit_card': return '💳';
      case 'gold_loan': return '🥇';
      case 'personal_loan': return '💝';
      case 'education_loan': return '🎓';
      default: return '💰';
    }
  };

  const getStatusColor = () => {
    switch (status.loanType) {
      case 'emi':
        return 'from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800';
      case 'credit_card':
        return 'from-red-100 to-pink-100 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-800';
      case 'gold_loan':
        return 'from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'from-gray-100 to-slate-100 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const calculateProgress = () => {
    if (status.emi === 0) return 0;
    const totalMonths = status.monthsElapsed + status.remainingMonths;
    return totalMonths > 0 ? Math.round((status.monthsElapsed / totalMonths) * 100) : 0;
  };

  const progress = calculateProgress();

  return (
    <Card className={`border-2 bg-gradient-to-br ${getStatusColor()} hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-4xl">{getEmoji()}</div>
              <div>
                <h4 className="text-xl font-bold text-gray-800 dark:text-white">{liability.institution}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 capitalize">{liability.type.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(status.outstandingBalance)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{formatPercentage(liability.interest_rate)}</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-white/50 dark:bg-black/20 rounded-xl">
              <div className="text-2xl mb-1">💳</div>
              <div className="text-lg font-semibold text-gray-800 dark:text-white">
                {status.emi > 0 ? formatCurrency(status.emi) : 'No EMI'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Monthly Payment</div>
            </div>
            <div className="text-center p-4 bg-white/50 dark:bg-black/20 rounded-xl">
              <div className="text-2xl mb-1">⏰</div>
              <div className="text-lg font-semibold text-gray-800 dark:text-white">
                {status.remainingMonths > 0 ? `${status.remainingMonths} months` : 'No tenure'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Remaining</div>
            </div>
          </div>

          {/* Progress Bar for EMI loans */}
          {status.emi > 0 && status.remainingMonths > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Progress</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {progress}% • {status.remainingMonths} months left
                </span>
              </div>
              <div className="w-full bg-white/50 dark:bg-black/20 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-white/50 dark:bg-black/20 border-white/50 dark:border-black/20 hover:bg-white/70 dark:hover:bg-black/30"
            >
              <span className="mr-2">🧮</span>
              Analyze
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="bg-white/50 dark:bg-black/20 border-white/50 dark:border-black/20 hover:bg-white/70 dark:hover:bg-black/30"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="bg-white/50 dark:bg-black/20 border-white/50 dark:border-black/20 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Details Section */}
          {showDetails && (
            <div className="pt-4 border-t border-white/30 dark:border-black/30">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Original Amount:</span>
                  <span className="font-medium text-gray-800 dark:text-white">{formatCurrency(status.originalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Months Elapsed:</span>
                  <span className="font-medium text-gray-800 dark:text-white">{status.monthsElapsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Monthly Interest:</span>
                  <span className="font-medium text-gray-800 dark:text-white">{formatCurrency(status.monthlyInterestAccrual)}</span>
                </div>
                {status.minimumDue && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Minimum Due:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{formatCurrency(status.minimumDue)}</span>
                  </div>
                )}
              </div>
              <div className="mt-3 p-3 bg-white/30 dark:bg-black/30 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-300">{status.explanation}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Journey View Component
function JourneyView({ liabilities, liabilityStatuses }: { liabilities: UltraSimpleLiabilityInput[], liabilityStatuses: EnhancedLoanStatus[] }) {
  return (
    <Card className="border-0 shadow-xl bg-gradient-to-r from-white to-green-50 dark:from-gray-800 dark:to-green-900/20">
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          <div className="text-6xl">🗺️</div>
          <h3 className="text-3xl font-bold text-gray-800 dark:text-white">Your Debt-Free Journey</h3>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Track your progress and celebrate milestones along the way! 🎉
          </p>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🚧</div>
            <p className="text-gray-600 dark:text-gray-300">Journey visualization coming soon!</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Celebration View Component
function CelebrationView({ liabilities, liabilityStatuses }: { liabilities: UltraSimpleLiabilityInput[], liabilityStatuses: EnhancedLoanStatus[] }) {
  return (
    <Card className="border-0 shadow-xl bg-gradient-to-r from-white to-yellow-50 dark:from-gray-800 dark:to-yellow-900/20">
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          <div className="text-6xl">🎉</div>
          <h3 className="text-3xl font-bold text-gray-800 dark:text-white">Celebration Station</h3>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Celebrate your wins and stay motivated! 🏆
          </p>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎊</div>
            <p className="text-gray-600 dark:text-gray-300">Celebration features coming soon!</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Insights View Component
function InsightsView({ liabilities, liabilityStatuses }: { liabilities: UltraSimpleLiabilityInput[], liabilityStatuses: EnhancedLoanStatus[] }) {
  return (
    <Card className="border-0 shadow-xl bg-gradient-to-r from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/20">
      <CardContent className="p-8">
        <div className="text-center space-y-6">
          <div className="text-6xl">🧠</div>
          <h3 className="text-3xl font-bold text-gray-800 dark:text-white">Smart Insights</h3>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            AI-powered insights to optimize your debt payoff! 🤖
          </p>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🔮</div>
            <p className="text-gray-600 dark:text-gray-300">Advanced insights coming soon!</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}