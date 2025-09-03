"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Label } from "../../../../components/Label";
import { 
  ArrowLeft, 
  Save, 
  Calculator, 
  Brain, 
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Percent,
  Calendar,
  Clock,
  Shield,
  Zap
} from "lucide-react";
import { SmartLiability, formatCurrency, formatPercentage } from "@/lib/smartRepayments";

interface SmartLiabilityFormProps {
  onSave: (liability: SmartLiability) => void;
  onCancel: () => void;
  initialData?: Partial<SmartLiability>;
}

const LIABILITY_TYPES = [
  { value: 'loan', label: 'Personal Loan', category: 'unsecured', icon: '💰' },
  { value: 'credit_card', label: 'Credit Card', category: 'revolving', icon: '💳' },
  { value: 'bnpl', label: 'Buy Now Pay Later', category: 'revolving', icon: '📱' },
  { value: 'gold_loan', label: 'Gold Loan', category: 'secured', icon: '🥇' },
  { value: 'business_loan', label: 'Business Loan', category: 'term', icon: '🏢' },
  { value: 'education_loan', label: 'Education Loan', category: 'term', icon: '🎓' },
  { value: 'home_loan', label: 'Home Loan', category: 'secured', icon: '🏠' },
  { value: 'car_loan', label: 'Car Loan', category: 'secured', icon: '🚗' },
  { value: 'other', label: 'Other Liability', category: 'other', icon: '📋' }
];

const INTEREST_TYPES = [
  { value: 'simple', label: 'Simple Interest', description: 'Interest calculated only on principal' },
  { value: 'compound', label: 'Compound Interest', description: 'Interest calculated on principal + accumulated interest' },
  { value: 'reducing_balance', label: 'Reducing Balance', description: 'Interest calculated on outstanding balance (most common)' }
];

export default function SmartLiabilityForm({ onSave, onCancel, initialData }: SmartLiabilityFormProps) {
  const [formData, setFormData] = useState<Partial<SmartLiability>>({
    type: 'loan',
    category: 'unsecured',
    institution: '',
    principal: 0,
    interest_rate: 0,
    emi_amount: 0,
    tenure_months: 0,
    outstanding_balance: 0,
    start_date: '',
    due_date: '',
    status: 'active',
    interest_type: 'reducing_balance',
    compounding_frequency: 'monthly',
    grace_period_days: 0,
    late_fee_percentage: 0,
    prepayment_allowed: true,
    prepayment_penalty: 0,
    risk_score: 5,
    priority_level: 'medium',
    impact_on_credit_score: 'medium',
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCalculating, setIsCalculating] = useState(false);

  const handleInputChange = (field: keyof SmartLiability, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.institution?.trim()) {
      newErrors.institution = 'Institution name is required';
    }
    if (!formData.principal || formData.principal <= 0) {
      newErrors.principal = 'Principal amount must be greater than 0';
    }
    if (formData.interest_rate < 0) {
      newErrors.interest_rate = 'Interest rate cannot be negative';
    }
    if (formData.emi_amount < 0) {
      newErrors.emi_amount = 'EMI amount cannot be negative';
    }
    if (!formData.tenure_months || formData.tenure_months <= 0) {
      newErrors.tenure_months = 'Tenure must be greater than 0 months';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateEMI = () => {
    if (!formData.principal || !formData.interest_rate || !formData.tenure_months) {
      return;
    }

    setIsCalculating(true);
    
    const principal = formData.principal;
    const rate = formData.interest_rate / 100 / 12; // Monthly rate
    const tenure = formData.tenure_months;

    let emi = 0;
    if (rate === 0) {
      emi = principal / tenure;
    } else {
      emi = (principal * rate * Math.pow(1 + rate, tenure)) / (Math.pow(1 + rate, tenure) - 1);
    }

    setFormData(prev => ({ ...prev, emi_amount: Math.round(emi) }));
    setIsCalculating(false);
  };

  const calculateRiskScore = () => {
    let score = 5; // Base score

    // Interest rate impact
    if (formData.interest_rate > 20) score += 3;
    else if (formData.interest_rate > 15) score += 2;
    else if (formData.interest_rate > 10) score += 1;

    // EMI to income ratio (assuming 50k income for demo)
    const emiToIncomeRatio = (formData.emi_amount || 0) / 50000;
    if (emiToIncomeRatio > 0.5) score += 3;
    else if (emiToIncomeRatio > 0.3) score += 2;
    else if (emiToIncomeRatio > 0.2) score += 1;

    // Liability type impact
    if (formData.type === 'credit_card' || formData.type === 'bnpl') score += 2;
    else if (formData.type === 'personal_loan') score += 1;

    // Prepayment penalty impact
    if (formData.prepayment_penalty > 2) score += 1;

    score = Math.min(10, Math.max(1, score));
    setFormData(prev => ({ ...prev, risk_score: score }));
  };

  const handleSave = () => {
    if (!validateForm()) return;

    const liability: SmartLiability = {
      id: initialData?.id || crypto.randomUUID(),
      type: formData.type || 'loan',
      category: formData.category || 'unsecured',
      institution: formData.institution || '',
      principal: formData.principal || 0,
      interest_rate: formData.interest_rate || 0,
      emi_amount: formData.emi_amount || 0,
      tenure_months: formData.tenure_months || 0,
      outstanding_balance: formData.outstanding_balance || formData.principal || 0,
      start_date: formData.start_date || '',
      due_date: formData.due_date || '',
      status: formData.status || 'active',
      interest_type: formData.interest_type || 'reducing_balance',
      compounding_frequency: formData.compounding_frequency || 'monthly',
      grace_period_days: formData.grace_period_days || 0,
      late_fee_percentage: formData.late_fee_percentage || 0,
      prepayment_allowed: formData.prepayment_allowed ?? true,
      prepayment_penalty: formData.prepayment_penalty || 0,
      risk_score: formData.risk_score || 5,
      priority_level: formData.priority_level || 'medium',
      impact_on_credit_score: formData.impact_on_credit_score || 'medium',
      created_at: initialData?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onSave(liability);
  };

  const selectedType = LIABILITY_TYPES.find(t => t.value === formData.type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={onCancel} className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {initialData ? 'Edit Liability' : 'Add Smart Liability'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Capture any type of debt with intelligent analysis
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-600">AI-Powered</span>
        </div>
      </div>

      {/* Simple Liability Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>What type of debt is this?</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {LIABILITY_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  handleInputChange('type', type.value);
                  handleInputChange('category', type.category);
                  calculateRiskScore();
                }}
                className={`p-3 border rounded-lg text-center transition-colors ${
                  formData.type === type.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="space-y-2">
                  <span className="text-2xl block">{type.icon}</span>
                  <p className="text-sm font-medium">{type.label}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Simple Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Basic Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="institution">Institution Name *</Label>
              <Input
                id="institution"
                type="text"
                placeholder="e.g., HDFC Bank, Local Bank"
                value={formData.institution}
                onChange={(e) => handleInputChange('institution', e.target.value)}
                className={errors.institution ? 'border-red-500' : ''}
              />
              {errors.institution && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.institution}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="principal">Amount (₹) *</Label>
                <Input
                  id="principal"
                  type="number"
                  placeholder="100000"
                  value={formData.principal || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    handleInputChange('principal', value);
                    handleInputChange('outstanding_balance', value);
                    calculateRiskScore();
                  }}
                  className={errors.principal ? 'border-red-500' : ''}
                />
                {errors.principal && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.principal}</p>
                )}
              </div>

              <div>
                <Label htmlFor="interest_rate">Interest Rate (%) *</Label>
                <Input
                  id="interest_rate"
                  type="number"
                  step="0.01"
                  placeholder="12.5"
                  value={formData.interest_rate || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    handleInputChange('interest_rate', value);
                    calculateRiskScore();
                  }}
                  className={errors.interest_rate ? 'border-red-500' : ''}
                />
                {errors.interest_rate && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.interest_rate}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emi_amount">Monthly EMI (₹) *</Label>
                <Input
                  id="emi_amount"
                  type="number"
                  placeholder="5000 (0 for gold loans)"
                  value={formData.emi_amount || ''}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    handleInputChange('emi_amount', value);
                    calculateRiskScore();
                  }}
                  className={errors.emi_amount ? 'border-red-500' : ''}
                />
                {errors.emi_amount && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.emi_amount}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Set to 0 for loans without regular EMI
                </p>
              </div>

              <div>
                <Label htmlFor="tenure_months">Tenure (months) *</Label>
                <Input
                  id="tenure_months"
                  type="number"
                  placeholder="60"
                  value={formData.tenure_months || ''}
                  onChange={(e) => handleInputChange('tenure_months', parseInt(e.target.value) || 0)}
                  className={errors.tenure_months ? 'border-red-500' : ''}
                />
                {errors.tenure_months && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.tenure_months}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick EMI Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="w-5 h-5" />
            <span>Quick EMI Calculator</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                Don't know your EMI? We can calculate it for you.
              </p>
            </div>
            <Button
              onClick={calculateEMI}
              disabled={isCalculating || !formData.principal || !formData.interest_rate || !formData.tenure_months}
              variant="outline"
            >
              <Calculator className="w-4 h-4 mr-2" />
              {isCalculating ? 'Calculating...' : 'Calculate EMI'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Smart Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5" />
            <span>Smart Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Risk Level</div>
              <div className={`text-lg font-semibold mb-1 ${
                formData.risk_score > 7 ? 'text-red-600 dark:text-red-400' : 
                formData.risk_score > 4 ? 'text-orange-600 dark:text-orange-400' : 
                'text-green-600 dark:text-green-400'
              }`}>
                {formData.risk_score > 7 ? 'High' : formData.risk_score > 4 ? 'Medium' : 'Low'}
              </div>
              <div className="text-[10px] text-muted-foreground">Risk Score</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Priority</div>
              <div className={`text-lg font-semibold mb-1 capitalize ${
                formData.priority_level === 'high' ? 'text-red-600 dark:text-red-400' : 
                formData.priority_level === 'medium' ? 'text-orange-600 dark:text-orange-400' : 
                'text-green-600 dark:text-green-400'
              }`}>
                {formData.priority_level}
              </div>
              <div className="text-[10px] text-muted-foreground">Payoff Priority</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Credit Impact</div>
              <div className={`text-lg font-semibold mb-1 capitalize ${
                formData.impact_on_credit_score === 'high' ? 'text-red-600 dark:text-red-400' : 
                formData.impact_on_credit_score === 'medium' ? 'text-orange-600 dark:text-orange-400' : 
                'text-green-600 dark:text-green-400'
              }`}>
                {formData.impact_on_credit_score}
              </div>
              <div className="text-[10px] text-muted-foreground">Credit Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Save Liability
        </Button>
      </div>
    </div>
  );
}