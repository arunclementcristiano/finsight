"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/Card";
import { Button } from "../../components/Button";
import { Progress } from "../../components/Progress";
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Info } from "lucide-react";
import { 
  enhancedQuestions, 
  Question, 
  QuestionOption,
  calculateProgress,
  getNextUnansweredQuestion,
  validateAnswers,
  questionCategories
} from "../domain/enhancedQuestionnaire";
import { buildPlan } from "../domain/allocationEngine";
import { useRouter } from "next/navigation";
import { useApp } from "../../store";

interface EnhancedQuestionnaireProps {
  onComplete?: (allocation: any) => void;
  showProgress?: boolean;
  allowSkip?: boolean;
}

export default function EnhancedQuestionnaire({ 
  onComplete, 
  showProgress = true, 
  allowSkip = false 
}: EnhancedQuestionnaireProps) {
  const router = useRouter();
  const { questionnaire, setQuestionAnswer, setPlan } = useApp();
  
  // Enhanced state management
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentCategory, setCurrentCategory] = useState<string>("demographics");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [riskScore, setRiskScore] = useState<number>(50);

  // Filter questions by category for step-by-step flow
  const currentCategoryQuestions = enhancedQuestions.filter(q => q.category === currentCategory);
  const currentQuestion = currentCategoryQuestions[currentStep] || enhancedQuestions[0];
  
  // Calculate overall progress
  const progress = calculateProgress(answers);
  const totalCategories = Object.keys(questionCategories).length;
  const currentCategoryIndex = Object.keys(questionCategories).indexOf(currentCategory);

  // Update questionnaire store when answers change
  useEffect(() => {
    Object.entries(answers).forEach(([key, value]) => {
      setQuestionAnswer(key, value);
    });
  }, [answers, setQuestionAnswer]);

  // Real-time risk score calculation
  useEffect(() => {
    if (Object.keys(answers).length > 3) {
      try {
        // Simple risk score calculation for real-time feedback
        let score = 50; // Base score
        
        // Age impact
        if (answers.age === "<25" || answers.age === "25-35") score += 15;
        else if (answers.age === "55-65" || answers.age === "65+") score -= 15;
        
        // Horizon impact
        if (answers.investmentHorizon === "20+ years") score += 10;
        else if (answers.investmentHorizon === "<2 years") score -= 20;
        
        // Volatility comfort impact
        if (answers.volatilityComfort === "buy_more") score += 20;
        else if (answers.volatilityComfort === "panic_sell") score -= 25;
        
        // Loss tolerance impact
        if (answers.maxAcceptableLoss === "40%+") score += 15;
        else if (answers.maxAcceptableLoss === "5%") score -= 20;
        
        setRiskScore(Math.max(0, Math.min(100, score)));
      } catch (err) {
        // Silent fail for real-time calculation
      }
    }
  }, [answers]);

  const handleAnswer = (key: string, value: any) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    setErrors([]); // Clear errors when user interacts
  };

  const validateCurrentAnswer = (): boolean => {
    if (!currentQuestion.required) return true;
    
    const value = answers[currentQuestion.key];
    
    if (value === undefined || value === null || value === "") {
      setErrors([`${currentQuestion.title} is required`]);
      return false;
    }
    
    // Additional validation for number fields
    if (currentQuestion.type === "number" && currentQuestion.validationRules) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        setErrors([`${currentQuestion.title} must be a valid number`]);
        return false;
      }
      if (currentQuestion.validationRules.min !== undefined && numValue < currentQuestion.validationRules.min) {
        setErrors([`${currentQuestion.title} must be at least ₹${currentQuestion.validationRules.min.toLocaleString()}`]);
        return false;
      }
      if (currentQuestion.validationRules.max !== undefined && numValue > currentQuestion.validationRules.max) {
        setErrors([`${currentQuestion.title} must be at most ₹${currentQuestion.validationRules.max.toLocaleString()}`]);
        return false;
      }
    }
    
    setErrors([]);
    return true;
  };

  const nextStep = () => {
    if (!validateCurrentAnswer()) return;
    
    if (currentStep < currentCategoryQuestions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Move to next category
      const categories = Object.keys(questionCategories);
      const nextCategoryIndex = currentCategoryIndex + 1;
      
      if (nextCategoryIndex < categories.length) {
        setCurrentCategory(categories[nextCategoryIndex]);
        setCurrentStep(0);
      } else {
        // All categories completed, submit
        handleSubmit();
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      // Move to previous category
      const categories = Object.keys(questionCategories);
      const prevCategoryIndex = currentCategoryIndex - 1;
      
      if (prevCategoryIndex >= 0) {
        setCurrentCategory(categories[prevCategoryIndex]);
        const prevCategoryQuestions = enhancedQuestions.filter(q => q.category === categories[prevCategoryIndex]);
        setCurrentStep(prevCategoryQuestions.length - 1);
      }
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrors([]);
    
    try {
      // Validate all answers
      const validation = validateAnswers(answers);
      if (!validation.isValid) {
        setErrors(validation.errors);
        setIsSubmitting(false);
        return;
      }
      
      // Generate allocation using the sophisticated engine
      const allocation = buildPlan(answers);
      setPlan(allocation);
      
      // Create portfolio if needed
      try {
        let pid = (useApp.getState() as any).activePortfolioId as string | undefined;
        if (!pid) {
          const created = await (await fetch('/api/portfolio', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ name: 'My Portfolio' }) 
          })).json();
          pid = created?.portfolioId;
          if (pid) (useApp.getState() as any).setActivePortfolio(pid);
        }
      } catch (err) {
        console.warn("Failed to create portfolio:", err);
      }
      
      if (onComplete) {
        onComplete(allocation);
      } else {
        router.push("/PortfolioManagement/Plan");
      }
      
    } catch (err) {
      console.error("Failed to submit questionnaire:", err);
      setErrors(["Failed to generate allocation. Please try again."]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastStep = currentCategoryIndex === totalCategories - 1 && 
                   currentStep === currentCategoryQuestions.length - 1;

  const canProceed = !currentQuestion.required || 
                    answers[currentQuestion.key] !== undefined && 
                    answers[currentQuestion.key] !== null && 
                    answers[currentQuestion.key] !== "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Progress Section */}
      {showProgress && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Overall Progress */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm text-muted-foreground">{progress}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              {/* Category Progress */}
              <div className="grid grid-cols-5 gap-2 mt-4">
                {Object.entries(questionCategories).map(([key, category], index) => (
                  <div key={key} className="text-center">
                    <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-medium mb-1 ${
                      index < currentCategoryIndex ? 'bg-green-500 text-white' :
                      index === currentCategoryIndex ? 'bg-blue-500 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {index < currentCategoryIndex ? <CheckCircle className="w-4 h-4" /> : category.icon}
                    </div>
                    <div className="text-xs text-muted-foreground">{category.title}</div>
                  </div>
                ))}
              </div>
              
              {/* Real-time Risk Score */}
              {Object.keys(answers).length > 3 && (
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Current Risk Profile</span>
                    <span className={`text-sm font-bold ${
                      riskScore <= 35 ? 'text-blue-600' : 
                      riskScore <= 65 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {riskScore <= 35 ? 'Conservative' : 
                       riskScore <= 65 ? 'Moderate' : 'Aggressive'} ({riskScore}/100)
                    </span>
                  </div>
                  <Progress value={riskScore} className="h-1 mt-2" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{questionCategories[currentCategory as keyof typeof questionCategories].icon}</span>
                <CardTitle className="text-xl">{questionCategories[currentCategory as keyof typeof questionCategories].title}</CardTitle>
              </div>
              <CardDescription>{questionCategories[currentCategory as keyof typeof questionCategories].description}</CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {currentStep + 1} of {currentCategoryQuestions.length}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Current Question */}
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {currentQuestion.title}
                {currentQuestion.required && <span className="text-red-500">*</span>}
              </h3>
              <p className="text-muted-foreground">{currentQuestion.description}</p>
            </div>

            {/* Question Input */}
            <div className="space-y-3">
              {currentQuestion.type === "single-select" && currentQuestion.options && (
                <div className="grid gap-3">
                  {currentQuestion.options.map((option: QuestionOption) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
                        answers[currentQuestion.key] === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={currentQuestion.key}
                        value={option.value}
                        checked={answers[currentQuestion.key] === option.value}
                        onChange={(e) => handleAnswer(currentQuestion.key, e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        {option.helperText && (
                          <div className="text-sm text-muted-foreground mt-1">{option.helperText}</div>
                        )}
                        {option.riskImpact && (
                          <div className={`text-xs mt-1 ${
                            option.riskImpact === 'high' ? 'text-red-600' :
                            option.riskImpact === 'medium' ? 'text-orange-600' :
                            'text-blue-600'
                          }`}>
                            Risk Impact: {option.riskImpact}
                          </div>
                        )}
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        answers[currentQuestion.key] === option.value
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {answers[currentQuestion.key] === option.value && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === "multi-select" && currentQuestion.options && (
                <div className="grid gap-3">
                  {currentQuestion.options.map((option: QuestionOption) => (
                    <label
                      key={option.value}
                      className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
                        (answers[currentQuestion.key] || []).includes(option.value)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        value={option.value}
                        checked={(answers[currentQuestion.key] || []).includes(option.value)}
                        onChange={(e) => {
                          const currentValues = answers[currentQuestion.key] || [];
                          if (e.target.checked) {
                            handleAnswer(currentQuestion.key, [...currentValues, option.value]);
                          } else {
                            handleAnswer(currentQuestion.key, currentValues.filter((v: string) => v !== option.value));
                          }
                        }}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{option.label}</div>
                        {option.helperText && (
                          <div className="text-sm text-muted-foreground mt-1">{option.helperText}</div>
                        )}
                      </div>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        (answers[currentQuestion.key] || []).includes(option.value)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {(answers[currentQuestion.key] || []).includes(option.value) && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === "number" && (
                <div className="space-y-2">
                  <input
                    type="number"
                    value={answers[currentQuestion.key] || ""}
                    onChange={(e) => handleAnswer(currentQuestion.key, e.target.value)}
                    placeholder="Enter amount"
                    min={currentQuestion.validationRules?.min}
                    max={currentQuestion.validationRules?.max}
                    step={currentQuestion.validationRules?.step || 1}
                    className="w-full h-12 px-4 rounded-lg border border-border bg-background text-lg"
                  />
                  {currentQuestion.validationRules?.min && (
                    <div className="text-sm text-muted-foreground">
                      Minimum: ₹{currentQuestion.validationRules.min.toLocaleString()}
                    </div>
                  )}
                </div>
              )}

              {currentQuestion.type === "boolean" && (
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center justify-center p-4 rounded-lg border cursor-pointer transition-all ${
                    answers[currentQuestion.key] === true
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-border hover:bg-muted/50'
                  }`}>
                    <input
                      type="radio"
                      name={currentQuestion.key}
                      checked={answers[currentQuestion.key] === true}
                      onChange={() => handleAnswer(currentQuestion.key, true)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="font-medium">Yes</div>
                    </div>
                  </label>
                  <label className={`flex items-center justify-center p-4 rounded-lg border cursor-pointer transition-all ${
                    answers[currentQuestion.key] === false
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-border hover:bg-muted/50'
                  }`}>
                    <input
                      type="radio"
                      name={currentQuestion.key}
                      checked={answers[currentQuestion.key] === false}
                      onChange={() => handleAnswer(currentQuestion.key, false)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="font-medium">No</div>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4" />
                  <div className="text-sm">
                    {errors.map((error, index) => (
                      <div key={index}>{error}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentCategoryIndex === 0 && currentStep === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              {allowSkip && !currentQuestion.required && (
                <Button variant="ghost" onClick={nextStep}>
                  Skip
                </Button>
              )}
              
              <Button
                onClick={isLastStep ? handleSubmit : nextStep}
                disabled={!canProceed || isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating Plan...
                  </>
                ) : isLastStep ? (
                  <>
                    Generate My Plan
                    <CheckCircle className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="space-y-1">
              <div className="font-medium text-sm">Why do we ask this?</div>
              <div className="text-sm text-muted-foreground">
                This information helps our AI financial advisor create a personalized allocation 
                that matches your risk tolerance, goals, and financial situation. All responses 
                are used to provide you with professional-grade investment recommendations.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}