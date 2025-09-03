"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { Plus, TrendingDown, Calendar, DollarSign, AlertTriangle, CreditCard, Home, Car, User, Smartphone, Calculator, Target, Zap, Clock, TrendingUp, Trash2, Brain, ArrowUpRight } from "lucide-react";
import { Modal } from "../../../components/Modal";
import SmartLiabilityForm from "./components/SmartLiabilityForm";
import { SmartLiability, formatCurrency, formatPercentage } from "@/lib/smartRepayments";

export default function RepaymentsPage() {
  const [smartLiabilities, setSmartLiabilities] = useState<SmartLiability[]>([]);
  const [showSmartModal, setShowSmartModal] = useState(false);

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

  const generateSmartRecommendations = (liabilities: SmartLiability[]) => {
    const recommendations = [];
    
    // High interest rate warning
    const highInterestLiabilities = liabilities.filter(l => l.interest_rate > 15);
    if (highInterestLiabilities.length > 0) {
      recommendations.push({
        priority: 'high',
        type: 'optimization',
        title: 'High Interest Rate Alert',
        description: `You have ${highInterestLiabilities.length} liability(ies) with interest rates above 15%`,
        impact: 'High interest rates are significantly increasing your debt burden',
        action: 'Consider refinancing or prepayment strategies',
        savings: highInterestLiabilities.reduce((sum, l) => sum + l.outstanding_balance * 0.05, 0)
      });
    }
    
    // No EMI warning
    const noEMILiabilities = liabilities.filter(l => l.emi_amount === 0);
    if (noEMILiabilities.length > 0) {
      recommendations.push({
        priority: 'high',
        type: 'warning',
        title: 'Interest Accumulation Alert',
        description: `${noEMILiabilities.length} liability(ies) have no EMI - interest is accumulating daily`,
        impact: 'Interest is piling up without regular payments',
        action: 'Consider making regular payments to reduce interest burden',
        savings: noEMILiabilities.reduce((sum, l) => sum + l.outstanding_balance * l.interest_rate / 100 / 12, 0)
      });
    }
    
    // Prepayment opportunity
    const prepaymentCandidates = liabilities.filter(l => l.interest_rate > 10 && l.outstanding_balance > 50000);
    if (prepaymentCandidates.length > 0) {
      recommendations.push({
        priority: 'medium',
        type: 'opportunity',
        title: 'Prepayment Opportunity',
        description: `${prepaymentCandidates.length} liability(ies) are good candidates for prepayment`,
        impact: 'Strategic prepayments could save significant interest',
        action: 'Use prepayment calculator to find optimal strategies',
        savings: prepaymentCandidates.reduce((sum, l) => sum + l.outstanding_balance * 0.1, 0)
      });
    }
    
    return recommendations;
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
            Minimal input, maximum insights - Your personal debt advisor
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

      {/* Debt Health Score - Consistent with Plan page style */}
      {smartLiabilities.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Debt Health</div>
            <div className="text-lg font-semibold text-green-600 dark:text-green-400 mb-1">
              {calculateDebtHealthScore(smartLiabilities)}/100
            </div>
            <div className="text-[10px] text-muted-foreground">Overall Score</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Total Debt</div>
            <div className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">
              {formatCurrency(smartLiabilities.reduce((sum, l) => sum + l.outstanding_balance, 0))}
            </div>
            <div className="text-[10px] text-muted-foreground">Outstanding</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Monthly EMIs</div>
            <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-1">
              {formatCurrency(smartLiabilities.reduce((sum, l) => sum + l.emi_amount, 0))}
            </div>
            <div className="text-[10px] text-muted-foreground">Due Monthly</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Interest Rate</div>
            <div className="text-lg font-semibold text-orange-600 dark:text-orange-400 mb-1">
              {formatPercentage(smartLiabilities.length > 0 ? 
                smartLiabilities.reduce((sum, l) => sum + l.interest_rate, 0) / smartLiabilities.length : 0)}
            </div>
            <div className="text-[10px] text-muted-foreground">Average</div>
          </div>
        </div>
      )}

      {/* Smart Insights Dashboard */}
      {smartLiabilities.length > 0 ? (
        <div className="space-y-6">
          {/* Smart Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <span>Smart Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {generateSmartRecommendations(smartLiabilities).map((rec, index) => (
                  <div key={index} className="p-4 border border-border rounded-lg bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rec.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            rec.priority === 'medium' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {rec.priority.toUpperCase()}
                          </span>
                          <span className="text-xs text-muted-foreground">{rec.type}</span>
                        </div>
                        <h4 className="font-semibold text-foreground mb-1">{rec.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                        <p className="text-sm font-medium text-foreground mb-1">Impact: {rec.impact}</p>
                        <p className="text-sm text-muted-foreground">Action: {rec.action}</p>
                        {rec.savings && (
                          <p className="text-sm font-bold text-green-600 dark:text-green-400 mt-2">
                            Potential Savings: {formatCurrency(rec.savings)}
                          </p>
                        )}
                      </div>
                      <Button size="sm" variant="outline">
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Liabilities Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Your Liabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {smartLiabilities.map((liability) => (
                  <div key={liability.id} className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          liability.type === 'home_loan' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          liability.type === 'car_loan' ? 'bg-green-100 dark:bg-green-900/30' :
                          liability.type === 'credit_card' ? 'bg-red-100 dark:bg-red-900/30' :
                          liability.type === 'gold_loan' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                          'bg-gray-100 dark:bg-gray-900/30'
                        }`}>
                          {liability.type === 'home_loan' && <Home className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                          {liability.type === 'car_loan' && <Car className="w-5 h-5 text-green-600 dark:text-green-400" />}
                          {liability.type === 'credit_card' && <CreditCard className="w-5 h-5 text-red-600 dark:text-red-400" />}
                          {liability.type === 'gold_loan' && <DollarSign className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />}
                          {!['home_loan', 'car_loan', 'credit_card', 'gold_loan'].includes(liability.type) && <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{liability.institution}</h4>
                          <p className="text-sm text-muted-foreground capitalize">{liability.type.replace('_', ' ')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{formatCurrency(liability.outstanding_balance)}</p>
                        <p className="text-sm text-muted-foreground">{formatPercentage(liability.interest_rate)}</p>
                      </div>
                    </div>
                    
                    {/* Visual Progress */}
                    <div className="space-y-2 mb-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium text-foreground">
                          {liability.emi_amount > 0 ? 
                            `${Math.round((liability.principal - liability.outstanding_balance) / liability.principal * 100)}%` : 
                            'No EMI'
                          }
                        </span>
                      </div>
                      {liability.emi_amount > 0 && (
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.round((liability.principal - liability.outstanding_balance) / liability.principal * 100)}%` }}
                          ></div>
                        </div>
                      )}
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground">Monthly EMI</p>
                        <p className="font-semibold text-foreground">
                          {liability.emi_amount > 0 ? formatCurrency(liability.emi_amount) : 'No EMI'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Risk Level</p>
                        <p className={`font-semibold ${
                          liability.risk_score > 7 ? 'text-red-600 dark:text-red-400' :
                          liability.risk_score > 4 ? 'text-orange-600 dark:text-orange-400' :
                          'text-green-600 dark:text-green-400'
                        }`}>
                          {liability.risk_score > 7 ? 'High' : liability.risk_score > 4 ? 'Medium' : 'Low'}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-primary border-primary hover:bg-primary/10"
                      >
                        <Calculator className="w-4 h-4 mr-1" />
                        Analyze
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSmartLiability(liability.id)}
                        className="text-destructive border-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="p-3 bg-muted rounded-full w-12 h-12 mx-auto mb-4">
              <TrendingDown className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Liabilities Yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Add your first liability to get started with smart debt management and insights.
            </p>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setShowSmartModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
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