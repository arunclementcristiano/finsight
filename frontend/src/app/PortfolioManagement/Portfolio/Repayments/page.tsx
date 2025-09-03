"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { Plus, TrendingDown, Calendar, DollarSign, AlertTriangle, CreditCard, Home, Car, User, Smartphone, Calculator, Target, Zap, Clock, TrendingUp, Trash2, Brain, ArrowUpRight, Play, BarChart3, PieChart, LineChart, Activity, Eye, Settings } from "lucide-react";
import { Modal } from "../../../components/Modal";
import SmartLiabilityForm from "./components/SmartLiabilityForm";
import ScenarioPlayground from "./components/ScenarioPlayground";
import InsightsDashboard from "./components/InsightsDashboard";
import { SmartLiability, formatCurrency, formatPercentage } from "@/lib/smartRepayments";

export default function RepaymentsPage() {
  const [smartLiabilities, setSmartLiabilities] = useState<SmartLiability[]>([]);
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [selectedView, setSelectedView] = useState<'overview' | 'scenarios' | 'insights'>('overview');

  const handleSaveSmartLiability = (liability: SmartLiability) => {
    setSmartLiabilities(prev => [...prev, liability]);
    setShowSmartModal(false);
  };

  const handleDeleteSmartLiability = (id: string) => {
    setSmartLiabilities(prev => prev.filter(l => l.id !== id));
  };

  const calculateDebtHealthScore = (liabilities: SmartLiability[]): number => {
    if (liabilities.length === 0) return 0;
    
    let score = 100;
    
    // Deduct points for high interest rates
    const avgInterestRate = liabilities.reduce((sum, l) => sum + l.interest_rate, 0) / liabilities.length;
    if (avgInterestRate > 20) score -= 30;
    else if (avgInterestRate > 15) score -= 20;
    else if (avgInterestRate > 10) score -= 10;
    
    // Deduct points for high risk liabilities
    const highRiskCount = liabilities.filter(l => l.risk_score > 7).length;
    score -= highRiskCount * 15;
    
    // Deduct points for no EMI liabilities (interest accumulating)
    const noEMICount = liabilities.filter(l => l.emi_amount === 0).length;
    score -= noEMICount * 10;
    
    return Math.max(0, Math.min(100, score));
  };

  const getDebtHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getDebtHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Smart Repayments
          </h1>
          <p className="text-muted-foreground">
            Your personal debt advisor with visual insights and smart scenarios
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSmartModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Liability
        </Button>
      </div>

      {/* View Toggle */}
      <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setSelectedView('overview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedView === 'overview'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Eye className="w-4 h-4 mr-2 inline" />
          Overview
        </button>
        <button
          onClick={() => setSelectedView('scenarios')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedView === 'scenarios'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Play className="w-4 h-4 mr-2 inline" />
          Scenarios
        </button>
        <button
          onClick={() => setSelectedView('insights')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            selectedView === 'insights'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="w-4 h-4 mr-2 inline" />
          Insights
        </button>
      </div>

      {smartLiabilities.length > 0 ? (
        <>
          {/* Debt Health Score - Hero Section */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground mb-2">Your Debt Health</h2>
                    <div className="flex items-center space-x-4">
                      <div className={`text-5xl font-bold ${getDebtHealthColor(calculateDebtHealthScore(smartLiabilities))}`}>
                        {calculateDebtHealthScore(smartLiabilities)}/100
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          {getDebtHealthLabel(calculateDebtHealthScore(smartLiabilities))}
                        </p>
                        <p className="text-muted-foreground">
                          {smartLiabilities.length} liability{smartLiabilities.length > 1 ? 'ies' : ''} tracked
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(smartLiabilities.reduce((sum, l) => sum + l.outstanding_balance, 0))}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Debt</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(smartLiabilities.reduce((sum, l) => sum + l.emi_amount, 0))}
                      </p>
                      <p className="text-sm text-muted-foreground">Monthly EMIs</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {formatPercentage(smartLiabilities.length > 0 ? 
                          smartLiabilities.reduce((sum, l) => sum + l.interest_rate, 0) / smartLiabilities.length : 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Avg Interest</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Activity className="w-16 h-16 text-white" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* View Content */}
          {selectedView === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    <span>Quick Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Calculator className="w-6 h-6" />
                      <span>Prepayment Calculator</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <Target className="w-6 h-6" />
                      <span>Payoff Strategy</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col space-y-2">
                      <TrendingUp className="w-6 h-6" />
                      <span>Refinance Check</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Liabilities Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {smartLiabilities.map((liability) => (
                  <LiabilityStoryCard
                    key={liability.id}
                    liability={liability}
                    onDelete={handleDeleteSmartLiability}
                  />
                ))}
              </div>
            </div>
          )}

          {selectedView === 'scenarios' && (
            <ScenarioPlayground liabilities={smartLiabilities} />
          )}

          {selectedView === 'insights' && (
            <InsightsDashboard liabilities={smartLiabilities} />
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <TrendingDown className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Start Your Debt-Free Journey
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Add your first liability to unlock powerful insights, visual scenarios, and personalized recommendations to help you become debt-free faster.
            </p>
            <Button 
              size="lg"
              onClick={() => setShowSmartModal(true)}
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Liability
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Smart Liability Modal */}
      <Modal
        open={showSmartModal}
        onClose={() => setShowSmartModal(false)}
        title="Add Smart Liability"
      >
        <SmartLiabilityForm
          onSave={handleSaveSmartLiability}
          onCancel={() => setShowSmartModal(false)}
        />
      </Modal>
    </div>
  );
}

// Liability Story Card Component
function LiabilityStoryCard({ liability, onDelete }: { liability: SmartLiability, onDelete: (id: string) => void }) {
  const [showDetails, setShowDetails] = useState(false);
  
  const getIcon = () => {
    switch (liability.type) {
      case 'home_loan':
        return <Home className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
      case 'car_loan':
        return <Car className="w-6 h-6 text-green-600 dark:text-green-400" />;
      case 'credit_card':
        return <CreditCard className="w-6 h-6 text-red-600 dark:text-red-400" />;
      case 'gold_loan':
        return <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <User className="w-6 h-6 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getBgGradient = () => {
    switch (liability.type) {
      case 'home_loan':
        return 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20';
      case 'car_loan':
        return 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20';
      case 'credit_card':
        return 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20';
      case 'gold_loan':
        return 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20';
      default:
        return 'from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20';
    }
  };

  const calculateRemainingMonths = () => {
    if (!liability.start_date || !liability.tenure_months || liability.emi_amount === 0) {
      return null;
    }
    
    const startDate = new Date(liability.start_date);
    const currentDate = new Date();
    const monthsElapsed = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                         (currentDate.getMonth() - startDate.getMonth());
    
    return Math.max(0, liability.tenure_months - monthsElapsed);
  };

  const calculateProgress = () => {
    if (liability.emi_amount === 0) return 0;
    const remainingMonths = calculateRemainingMonths();
    if (!remainingMonths) return 0;
    return Math.round(((liability.tenure_months - remainingMonths) / liability.tenure_months) * 100);
  };

  const remainingMonths = calculateRemainingMonths();
  const progress = calculateProgress();

  return (
    <Card className={`bg-gradient-to-br ${getBgGradient()} border-0 shadow-lg hover:shadow-xl transition-all duration-300`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/50 dark:bg-black/20 rounded-xl">
                {getIcon()}
              </div>
              <div>
                <h4 className="text-lg font-bold text-foreground">{liability.institution}</h4>
                <p className="text-sm text-muted-foreground capitalize">{liability.type.replace('_', ' ')}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{formatCurrency(liability.outstanding_balance)}</p>
              <p className="text-sm text-muted-foreground">{formatPercentage(liability.interest_rate)}</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-white/30 dark:bg-black/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Monthly EMI</p>
              <p className="text-lg font-bold text-foreground">
                {liability.emi_amount > 0 ? formatCurrency(liability.emi_amount) : 'No EMI'}
              </p>
            </div>
            <div className="text-center p-3 bg-white/30 dark:bg-black/20 rounded-lg">
              <p className="text-sm text-muted-foreground">Risk Level</p>
              <p className={`text-lg font-bold ${
                liability.risk_score > 7 ? 'text-red-600 dark:text-red-400' :
                liability.risk_score > 4 ? 'text-orange-600 dark:text-orange-400' :
                'text-green-600 dark:text-green-400'
              }`}>
                {liability.risk_score > 7 ? 'High' : liability.risk_score > 4 ? 'Medium' : 'Low'}
              </p>
            </div>
          </div>

          {/* Progress Bar for EMI loans */}
          {liability.emi_amount > 0 && remainingMonths && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground">
                  {progress}% • {remainingMonths} months left
                </span>
              </div>
              <div className="w-full bg-white/30 dark:bg-black/20 rounded-full h-3">
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
              className="flex-1 bg-white/50 dark:bg-black/20 border-white/50 dark:border-black/20"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Analyze
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="bg-white/50 dark:bg-black/20 border-white/50 dark:border-black/20"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(liability.id)}
              className="bg-white/50 dark:bg-black/20 border-white/50 dark:border-black/20 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Scenario Playground Component
function ScenarioPlayground({ liabilities }: { liabilities: SmartLiability[] }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Play className="w-5 h-5 text-purple-600" />
            <span>Scenario Playground</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Play className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Interactive Scenarios Coming Soon
            </h3>
            <p className="text-muted-foreground">
              Test different payment strategies and see their impact in real-time
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Insights Dashboard Component
function InsightsDashboard({ liabilities }: { liabilities: SmartLiability[] }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Insights Dashboard</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">
              Advanced Analytics Coming Soon
            </h3>
            <p className="text-muted-foreground">
              Deep insights, trends, and personalized recommendations
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}