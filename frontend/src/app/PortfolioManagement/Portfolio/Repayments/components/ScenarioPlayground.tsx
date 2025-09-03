"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Label } from "../../../../components/Label";
import { 
  Play, 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  DollarSign,
  Percent,
  Calendar,
  Zap,
  ArrowRight,
  BarChart3,
  PieChart,
  LineChart
} from "lucide-react";
import { SmartLiability, formatCurrency, formatPercentage } from "@/lib/smartRepayments";

interface ScenarioPlaygroundProps {
  liabilities: SmartLiability[];
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  type: 'prepayment' | 'refinance' | 'consolidation' | 'extra_emi';
  parameters: any;
  results: {
    interestSaved: number;
    monthsReduced: number;
    totalSavings: number;
    newMonthlyPayment?: number;
  };
}

export default function ScenarioPlayground({ liabilities }: ScenarioPlaygroundProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);

  const generateScenarios = () => {
    const newScenarios: Scenario[] = [];
    
    // Prepayment scenarios for each liability
    liabilities.forEach(liability => {
      if (liability.emi_amount > 0 && liability.interest_rate > 10) {
        // 10% prepayment
        newScenarios.push({
          id: `${liability.id}-prepay-10`,
          name: `Prepay 10% - ${liability.institution}`,
          description: `Pay ₹${Math.round(liability.outstanding_balance * 0.1).toLocaleString()} extra`,
          type: 'prepayment',
          parameters: { liabilityId: liability.id, amount: liability.outstanding_balance * 0.1 },
          results: calculatePrepaymentResults(liability, liability.outstanding_balance * 0.1)
        });
        
        // 25% prepayment
        newScenarios.push({
          id: `${liability.id}-prepay-25`,
          name: `Prepay 25% - ${liability.institution}`,
          description: `Pay ₹${Math.round(liability.outstanding_balance * 0.25).toLocaleString()} extra`,
          type: 'prepayment',
          parameters: { liabilityId: liability.id, amount: liability.outstanding_balance * 0.25 },
          results: calculatePrepaymentResults(liability, liability.outstanding_balance * 0.25)
        });
      }
    });

    // Extra EMI scenarios
    liabilities.forEach(liability => {
      if (liability.emi_amount > 0) {
        newScenarios.push({
          id: `${liability.id}-extra-emi`,
          name: `Extra EMI - ${liability.institution}`,
          description: `Pay ₹${Math.round(liability.emi_amount * 0.5).toLocaleString()} extra monthly`,
          type: 'extra_emi',
          parameters: { liabilityId: liability.id, extraAmount: liability.emi_amount * 0.5 },
          results: calculateExtraEMIResults(liability, liability.emi_amount * 0.5)
        });
      }
    });

    // Debt consolidation scenario
    if (liabilities.length > 2) {
      const highInterestLiabilities = liabilities.filter(l => l.interest_rate > 15);
      if (highInterestLiabilities.length > 1) {
        newScenarios.push({
          id: 'consolidation',
          name: 'Debt Consolidation',
          description: 'Consolidate high-interest debts at 12%',
          type: 'consolidation',
          parameters: { newRate: 12, liabilities: highInterestLiabilities.map(l => l.id) },
          results: calculateConsolidationResults(highInterestLiabilities, 12)
        });
      }
    }

    setScenarios(newScenarios);
  };

  const calculatePrepaymentResults = (liability: SmartLiability, amount: number) => {
    const monthlyRate = liability.interest_rate / 100 / 12;
    const remainingMonths = calculateRemainingMonths(liability);
    const newBalance = liability.outstanding_balance - amount;
    
    if (newBalance <= 0) {
      return {
        interestSaved: liability.outstanding_balance * monthlyRate * remainingMonths,
        monthsReduced: remainingMonths,
        totalSavings: liability.outstanding_balance * monthlyRate * remainingMonths
      };
    }
    
    const newMonths = Math.ceil(newBalance / liability.emi_amount);
    const interestSaved = (liability.emi_amount * remainingMonths) - (liability.emi_amount * newMonths) - amount;
    const monthsReduced = remainingMonths - newMonths;
    
    return {
      interestSaved: Math.max(0, interestSaved),
      monthsReduced: Math.max(0, monthsReduced),
      totalSavings: Math.max(0, interestSaved)
    };
  };

  const calculateExtraEMIResults = (liability: SmartLiability, extraAmount: number) => {
    const totalEMI = liability.emi_amount + extraAmount;
    const remainingMonths = calculateRemainingMonths(liability);
    const newMonths = Math.ceil(liability.outstanding_balance / totalEMI);
    const interestSaved = (liability.emi_amount * remainingMonths) - (totalEMI * newMonths);
    const monthsReduced = remainingMonths - newMonths;
    
    return {
      interestSaved: Math.max(0, interestSaved),
      monthsReduced: Math.max(0, monthsReduced),
      totalSavings: Math.max(0, interestSaved),
      newMonthlyPayment: totalEMI
    };
  };

  const calculateConsolidationResults = (liabilities: SmartLiability[], newRate: number) => {
    const totalAmount = liabilities.reduce((sum, l) => sum + l.outstanding_balance, 0);
    const avgTenure = Math.round(liabilities.reduce((sum, l) => sum + (l.tenure_months || 60), 0) / liabilities.length);
    
    const monthlyRate = newRate / 100 / 12;
    const newEMI = (totalAmount * monthlyRate * Math.pow(1 + monthlyRate, avgTenure)) / 
                   (Math.pow(1 + monthlyRate, avgTenure) - 1);
    
    const currentTotalEMI = liabilities.reduce((sum, l) => sum + l.emi_amount, 0);
    const monthlySavings = currentTotalEMI - newEMI;
    
    return {
      interestSaved: monthlySavings * avgTenure,
      monthsReduced: 0,
      totalSavings: monthlySavings * avgTenure,
      newMonthlyPayment: newEMI
    };
  };

  const calculateRemainingMonths = (liability: SmartLiability) => {
    if (!liability.start_date || !liability.tenure_months || liability.emi_amount === 0) {
      return 60; // Default assumption
    }
    
    const startDate = new Date(liability.start_date);
    const currentDate = new Date();
    const monthsElapsed = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                         (currentDate.getMonth() - startDate.getMonth());
    
    return Math.max(0, liability.tenure_months - monthsElapsed);
  };

  React.useEffect(() => {
    if (liabilities.length > 0) {
      generateScenarios();
    }
  }, [liabilities]);

  return (
    <div className="space-y-6">
      {/* Scenario Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Play className="w-5 h-5 text-purple-600" />
            <span>Scenario Generator</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Explore different strategies to optimize your debt payoff. We've generated personalized scenarios based on your liabilities.
            </p>
            
            {scenarios.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scenarios.map((scenario) => (
                  <Card 
                    key={scenario.id} 
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      activeScenario?.id === scenario.id ? 'ring-2 ring-purple-500' : ''
                    }`}
                    onClick={() => setActiveScenario(scenario)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          {scenario.type === 'prepayment' && <Target className="w-4 h-4 text-blue-600" />}
                          {scenario.type === 'extra_emi' && <TrendingUp className="w-4 h-4 text-green-600" />}
                          {scenario.type === 'consolidation' && <Zap className="w-4 h-4 text-purple-600" />}
                          <h4 className="font-semibold text-foreground">{scenario.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{scenario.description}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Interest Saved</p>
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(scenario.results.interestSaved)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Months Reduced</p>
                            <p className="font-semibold text-blue-600 dark:text-blue-400">
                              {scenario.results.monthsReduced}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Scenario Details */}
      {activeScenario && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              <span>Scenario Details: {activeScenario.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Results Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(activeScenario.results.interestSaved)}
                  </p>
                  <p className="text-sm text-muted-foreground">Interest Saved</p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {activeScenario.results.monthsReduced}
                  </p>
                  <p className="text-sm text-muted-foreground">Months Reduced</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(activeScenario.results.totalSavings)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Savings</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <Button className="flex-1">
                  <Target className="w-4 h-4 mr-2" />
                  Apply This Strategy
                </Button>
                <Button variant="outline">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Detailed Analysis
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Scenario Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="w-5 h-5 text-orange-600" />
            <span>Custom Scenario Builder</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Build Your Own Scenario
            </h3>
            <p className="text-muted-foreground mb-4">
              Create custom scenarios with your own parameters
            </p>
            <Button variant="outline">
              <ArrowRight className="w-4 h-4 mr-2" />
              Open Scenario Builder
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}