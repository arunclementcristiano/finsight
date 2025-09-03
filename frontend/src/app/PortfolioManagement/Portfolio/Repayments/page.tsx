"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { Plus, TrendingDown, Calendar, DollarSign, AlertTriangle, CreditCard, Home, Car, User, Smartphone, Calculator, Target, Zap, Clock, TrendingUp, Trash2, Brain, ArrowUpRight } from "lucide-react";
import { Modal } from "../../../components/Modal";
import SmartLiabilityForm from "./components/SmartLiabilityForm";
import LiabilityCard from "./components/LiabilityCard";
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
        description: `${highInterestLiabilities.map(l => l.institution).join(', ')} have rates above 15%`,
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
        description: `${noEMILiabilities.map(l => l.institution).join(', ')} have no EMI - interest accumulating daily`,
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
        description: `${prepaymentCandidates.map(l => l.institution).join(', ')} are good candidates for prepayment`,
        impact: 'Strategic prepayments could save significant interest',
        action: 'Use prepayment calculator to find optimal strategies',
        savings: prepaymentCandidates.reduce((sum, l) => sum + l.outstanding_balance * 0.1, 0)
      });
    }
    
    // Debt consolidation opportunity
    if (liabilities.length > 3) {
      const totalEMI = liabilities.reduce((sum, l) => sum + l.emi_amount, 0);
      const avgInterestRate = liabilities.reduce((sum, l) => sum + l.interest_rate, 0) / liabilities.length;
      
      if (avgInterestRate > 12) {
        recommendations.push({
          priority: 'medium',
          type: 'consolidation',
          title: 'Debt Consolidation Opportunity',
          description: 'Multiple high-interest liabilities could be consolidated',
          impact: `Potential monthly savings of ${formatCurrency(totalEMI * 0.15)}`,
          action: 'Explore debt consolidation loan options',
          savings: totalEMI * 0.15 * 12
        });
      }
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
                  <LiabilityCard
                    key={liability.id}
                    liability={liability}
                    onDelete={handleDeleteSmartLiability}
                  />
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