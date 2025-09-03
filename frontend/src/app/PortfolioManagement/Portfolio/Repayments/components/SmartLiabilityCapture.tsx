"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/Card";
import { Button } from "../../../../components/Button";
import { Input } from "../../../../components/Input";
import { Label } from "../../../../components/Label";
import { 
  Home, 
  Car, 
  CreditCard, 
  Award, 
  Heart, 
  Star, 
  Settings,
  Calculator,
  Calendar,
  DollarSign,
  Percent,
  Info,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Sparkles
} from "lucide-react";
import { UltraSimpleLiabilityInput, LoanCategory } from "../../../domain/Repaymentadvisor/repaymentEngine";

interface SmartLiabilityCaptureProps {
  onSave: (liability: UltraSimpleLiabilityInput) => void;
  onCancel: () => void;
}

export default function SmartLiabilityCapture({ onSave, onCancel }: SmartLiabilityCaptureProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<UltraSimpleLiabilityInput>>({
    type: 'home_loan',
    interest_rate: 0,
    institution: '',
    start_date: '',
    original_amount: 0,
    tenure_months: undefined
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loanTypes: { value: LoanCategory; label: string; icon: React.ReactNode; description: string; defaultTenure: number }[] = [
    {
      value: 'home_loan',
      label: 'Home Loan',
      icon: <Home className="w-6 h-6" />,
      description: 'Long-term loan for property purchase',
      defaultTenure: 180
    },
    {
      value: 'car_loan',
      label: 'Car Loan',
      icon: <Car className="w-6 h-6" />,
      description: 'Medium-term loan for vehicle purchase',
      defaultTenure: 60
    },
    {
      value: 'personal_loan',
      label: 'Personal Loan',
      icon: <Heart className="w-6 h-6" />,
      description: 'Short-term unsecured loan',
      defaultTenure: 36
    },
    {
      value: 'credit_card',
      label: 'Credit Card',
      icon: <CreditCard className="w-6 h-6" />,
      description: 'Revolving credit with no fixed EMI',
      defaultTenure: 0
    },
    {
      value: 'gold_loan',
      label: 'Gold Loan',
      icon: <Award className="w-6 h-6" />,
      description: 'Short-term secured loan against gold',
      defaultTenure: 12
    },
    {
      value: 'education_loan',
      label: 'Education Loan',
      icon: <Star className="w-6 h-6" />,
      description: 'Long-term loan for education expenses',
      defaultTenure: 84
    }
  ];

  const handleInputChange = (field: keyof UltraSimpleLiabilityInput, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.type) {
        newErrors.type = 'Please select a loan type';
      }
    }

    if (step === 2) {
      if (!formData.institution?.trim()) {
        newErrors.institution = 'Institution name is required';
      }
      if (!formData.start_date) {
        newErrors.start_date = 'Start date is required';
      } else if (new Date(formData.start_date) > new Date()) {
        newErrors.start_date = 'Start date cannot be in the future';
      }
    }

    if (step === 3) {
      if (!formData.original_amount || formData.original_amount <= 0) {
        newErrors.original_amount = 'Original amount must be positive';
      }
      if (!formData.interest_rate || formData.interest_rate <= 0 || formData.interest_rate > 50) {
        newErrors.interest_rate = 'Interest rate must be between 0% and 50%';
      }
    }

    if (step === 4) {
      const selectedType = loanTypes.find(t => t.value === formData.type);
      if (selectedType && selectedType.defaultTenure > 0) {
        if (!formData.tenure_months || formData.tenure_months <= 0) {
          newErrors.tenure_months = 'Tenure is required for this loan type';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSave = () => {
    if (validateStep(currentStep)) {
      const selectedType = loanTypes.find(t => t.value === formData.type);
      const liability: UltraSimpleLiabilityInput = {
        type: formData.type!,
        institution: formData.institution!,
        start_date: formData.start_date!,
        original_amount: formData.original_amount!,
        interest_rate: formData.interest_rate!,
        tenure_months: formData.tenure_months || selectedType?.defaultTenure
      };
      onSave(liability);
    }
  };

  const selectedLoanType = loanTypes.find(t => t.value === formData.type);

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step <= currentStep 
                ? 'bg-blue-500 text-white' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {step < currentStep ? <CheckCircle className="w-4 h-4" /> : step}
            </div>
            {step < 4 && (
              <div className={`w-12 h-1 mx-2 ${
                step < currentStep ? 'bg-blue-500' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Loan Type Selection */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>What type of loan is this?</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loanTypes.map((loanType) => (
                <div
                  key={loanType.value}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    formData.type === loanType.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-border hover:border-blue-300'
                  }`}
                  onClick={() => handleInputChange('type', loanType.value)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      formData.type === loanType.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {loanType.icon}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{loanType.label}</h4>
                      <p className="text-sm text-muted-foreground">{loanType.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {errors.type && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">{errors.type}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Basic Information */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="w-5 h-5 text-blue-600" />
              <span>Basic Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="institution">Institution Name *</Label>
              <Input
                id="institution"
                type="text"
                placeholder="Enter institution name (e.g., HDFC Bank, SBI, etc.)"
                value={formData.institution || ''}
                onChange={(e) => handleInputChange('institution', e.target.value)}
                className={errors.institution ? 'border-red-500' : ''}
              />
              {errors.institution && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.institution}</p>
              )}
            </div>

            <div>
              <Label htmlFor="start_date">Loan Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={errors.start_date ? 'border-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground mt-1">
                When did you start this loan?
              </p>
              {errors.start_date && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.start_date}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Financial Details */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span>Financial Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="original_amount">Original Loan Amount *</Label>
              <Input
                id="original_amount"
                type="number"
                placeholder="Enter original loan amount"
                value={formData.original_amount || ''}
                onChange={(e) => handleInputChange('original_amount', parseFloat(e.target.value) || 0)}
                className={errors.original_amount ? 'border-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground mt-1">
                How much did you borrow originally?
              </p>
              {errors.original_amount && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.original_amount}</p>
              )}
            </div>

            <div>
              <Label htmlFor="interest_rate">Interest Rate (%) *</Label>
              <Input
                id="interest_rate"
                type="number"
                step="0.1"
                placeholder="Enter annual interest rate"
                value={formData.interest_rate || ''}
                onChange={(e) => handleInputChange('interest_rate', parseFloat(e.target.value) || 0)}
                className={errors.interest_rate ? 'border-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Annual interest rate (e.g., 8.5 for 8.5%)
              </p>
              {errors.interest_rate && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.interest_rate}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Tenure (if applicable) */}
      {currentStep === 4 && selectedLoanType && selectedLoanType.defaultTenure > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Loan Tenure</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="tenure_months">Tenure (months) *</Label>
              <Input
                id="tenure_months"
                type="number"
                placeholder={`Default: ${selectedLoanType.defaultTenure} months`}
                value={formData.tenure_months || ''}
                onChange={(e) => handleInputChange('tenure_months', parseInt(e.target.value) || selectedLoanType.defaultTenure)}
                className={errors.tenure_months ? 'border-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Total loan tenure in months (default: {selectedLoanType.defaultTenure} months)
              </p>
              {errors.tenure_months && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.tenure_months}</p>
              )}
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start space-x-2">
                <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">Smart Calculation</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Our AI will automatically calculate your EMI, outstanding balance, and remaining tenure based on your inputs.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Summary (for non-EMI loans) */}
      {currentStep === 4 && selectedLoanType && selectedLoanType.defaultTenure === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-900 dark:text-green-100">Ready to Analyze</h4>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Your {selectedLoanType.label.toLowerCase()} will be analyzed for interest accumulation and optimization opportunities.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loan Type:</span>
                  <span className="font-medium">{selectedLoanType.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Institution:</span>
                  <span className="font-medium">{formData.institution}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start Date:</span>
                  <span className="font-medium">{formData.start_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Amount:</span>
                  <span className="font-medium">₹{formData.original_amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interest Rate:</span>
                  <span className="font-medium">{formData.interest_rate}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handlePrevious}
        >
          {currentStep === 1 ? 'Cancel' : 'Previous'}
        </Button>
        
        {currentStep < 4 ? (
          <Button onClick={handleNext}>
            Next
          </Button>
        ) : (
          <Button onClick={handleSave} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
            <Calculator className="w-4 h-4 mr-2" />
            Add Liability
          </Button>
        )}
      </div>
    </div>
  );
}