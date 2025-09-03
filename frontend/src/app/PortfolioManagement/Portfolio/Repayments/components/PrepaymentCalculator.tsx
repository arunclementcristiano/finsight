"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Label } from "../../../../components/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/Select";
import { Calculator, TrendingUp, Calendar, DollarSign, Clock } from "lucide-react";

interface PrepaymentCalculatorProps {
  repayment: {
    repayment_id: string;
    type: string;
    institution: string;
    principal: number;
    interest_rate: number;
    emi_amount: number;
    tenure_months: number;
    outstanding_balance: number;
    start_date: string;
    due_date: string;
  };
  onClose: () => void;
}

interface CalculationResult {
  originalTenure: number;
  newTenure: number;
  interestSaved: number;
  newClosureDate: string;
  newEMI: number;
  totalSavings: number;
}

export default function PrepaymentCalculator({ repayment, onClose }: PrepaymentCalculatorProps) {
  const [prepaymentAmount, setPrepaymentAmount] = useState<string>('');
  const [prepaymentType, setPrepaymentType] = useState<'lump_sum' | 'extra_emi'>('lump_sum');
  const [extraEMIMonths, setExtraEMIMonths] = useState<string>('');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculatePrepaymentImpact = () => {
    if (!prepaymentAmount || parseFloat(prepaymentAmount) <= 0) {
      return;
    }

    setIsCalculating(true);

    const principal = repayment.outstanding_balance;
    const rate = repayment.interest_rate / 100 / 12; // Monthly rate
    const emi = repayment.emi_amount;
    const prepayment = parseFloat(prepaymentAmount);

    // Calculate original remaining tenure
    const originalTenure = Math.ceil(principal / emi);

    let newPrincipal = principal;
    let newTenure = originalTenure;
    let interestSaved = 0;

    if (prepaymentType === 'lump_sum') {
      // Lump sum prepayment
      newPrincipal = Math.max(0, principal - prepayment);
      
      if (newPrincipal > 0) {
        // Calculate new tenure with same EMI
        if (rate === 0) {
          newTenure = Math.ceil(newPrincipal / emi);
        } else {
          // Using approximation for tenure calculation
          const months = Math.log(1 + (newPrincipal * rate) / emi) / Math.log(1 + rate);
          newTenure = Math.ceil(months);
        }
      } else {
        newTenure = 0;
      }

      // Calculate interest saved
      const originalTotalInterest = (emi * originalTenure) - principal;
      const newTotalInterest = newPrincipal > 0 ? (emi * newTenure) - newPrincipal : 0;
      interestSaved = originalTotalInterest - newTotalInterest;

    } else {
      // Extra EMI payments
      const extraMonths = parseInt(extraEMIMonths) || 0;
      if (extraMonths <= 0) {
        setIsCalculating(false);
        return;
      }

      const extraEMITotal = prepayment * extraMonths;
      newPrincipal = Math.max(0, principal - extraEMITotal);
      
      if (newPrincipal > 0) {
        if (rate === 0) {
          newTenure = Math.ceil(newPrincipal / emi);
        } else {
          const months = Math.log(1 + (newPrincipal * rate) / emi) / Math.log(1 + rate);
          newTenure = Math.ceil(months);
        }
      } else {
        newTenure = 0;
      }

      // Calculate interest saved
      const originalTotalInterest = (emi * originalTenure) - principal;
      const newTotalInterest = newPrincipal > 0 ? (emi * newTenure) - newPrincipal : 0;
      interestSaved = originalTotalInterest - newTotalInterest;
    }

    // Calculate new closure date
    const currentDate = new Date();
    const newClosureDate = new Date(currentDate);
    newClosureDate.setMonth(newClosureDate.getMonth() + newTenure);

    const calculationResult: CalculationResult = {
      originalTenure,
      newTenure,
      interestSaved,
      newClosureDate: newClosureDate.toLocaleDateString(),
      newEMI: emi,
      totalSavings: interestSaved
    };

    setResult(calculationResult);
    setIsCalculating(false);
  };

  const handlePrepaymentChange = (value: string) => {
    setPrepaymentAmount(value);
    setResult(null); // Clear previous results
  };

  const handleTypeChange = (value: string) => {
    setPrepaymentType(value as 'lump_sum' | 'extra_emi');
    setResult(null); // Clear previous results
  };

  const handleExtraEMIChange = (value: string) => {
    setExtraEMIMonths(value);
    setResult(null); // Clear previous results
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Prepayment Calculator
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {repayment.institution} - {repayment.type.replace('_', ' ').toUpperCase()}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Current Loan Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Loan Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Outstanding</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(repayment.outstanding_balance)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">EMI</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(repayment.emi_amount)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Interest Rate</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {repayment.interest_rate}%
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Remaining Tenure</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {Math.ceil(repayment.outstanding_balance / repayment.emi_amount)} months
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prepayment Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prepayment Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prepayment Type */}
          <div>
            <Label htmlFor="prepayment_type">Prepayment Type</Label>
            <Select value={prepaymentType} onValueChange={handleTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lump_sum">Lump Sum Payment</SelectItem>
                <SelectItem value="extra_emi">Extra EMI Payments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Prepayment Amount */}
          <div>
            <Label htmlFor="prepayment_amount">
              {prepaymentType === 'lump_sum' ? 'Lump Sum Amount (₹)' : 'Extra EMI Amount (₹)'}
            </Label>
            <Input
              id="prepayment_amount"
              type="number"
              placeholder="Enter amount"
              value={prepaymentAmount}
              onChange={(e) => handlePrepaymentChange(e.target.value)}
            />
          </div>

          {/* Extra EMI Months (only for extra EMI type) */}
          {prepaymentType === 'extra_emi' && (
            <div>
              <Label htmlFor="extra_emi_months">Number of Extra EMIs</Label>
              <Input
                id="extra_emi_months"
                type="number"
                placeholder="Enter number of months"
                value={extraEMIMonths}
                onChange={(e) => handleExtraEMIChange(e.target.value)}
              />
            </div>
          )}

          <Button
            onClick={calculatePrepaymentImpact}
            disabled={isCalculating || !prepaymentAmount || parseFloat(prepaymentAmount) <= 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Calculator className="w-4 h-4 mr-2" />
            {isCalculating ? 'Calculating...' : 'Calculate Impact'}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-green-600 dark:text-green-400">
              Prepayment Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tenure Comparison */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Tenure Comparison
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Original Tenure:</span>
                    <span className="font-medium">{result.originalTenure} months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">New Tenure:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {result.newTenure} months
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600 dark:text-gray-400">Months Saved:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {result.originalTenure - result.newTenure} months
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Impact */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Financial Impact
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Interest Saved:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(result.interestSaved)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">New Closure Date:</span>
                    <span className="font-medium">{result.newClosureDate}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600 dark:text-gray-400">Total Savings:</span>
                    <span className="font-bold text-green-600 dark:text-green-400 text-lg">
                      {formatCurrency(result.totalSavings)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => {
                  // TODO: Implement actual prepayment processing
                  console.log('Processing prepayment:', {
                    repayment_id: repayment.repayment_id,
                    amount: prepaymentAmount,
                    type: prepaymentType
                  });
                }}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Process Prepayment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}