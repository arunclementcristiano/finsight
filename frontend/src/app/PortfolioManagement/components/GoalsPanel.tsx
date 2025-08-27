'use client';

import React, { useState, useEffect } from 'react';

interface Goal {
  id: string;
  name: string;
  category: string;
  targetAmount: number;
  targetDate: Date;
  priority: "high" | "medium" | "low";
  currentProgress: number;
  isActive: boolean;
  createdAt: Date;
}

interface GoalsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalsUpdated: (goals: Goal[]) => void;
}

// Common goal names for dropdown
const COMMON_GOAL_NAMES = [
  "Retirement Fund",
  "Home Down Payment", 
  "Child Education",
  "Emergency Fund",
  "Wealth Building",
  "Vacation Fund",
  "Car Purchase",
  "Wedding Fund",
  "Business Investment",
  "Medical Fund",
  "Property Investment",
  "Tax Saving",
  "Insurance Premium",
  "Gift Fund",
  "Charity Fund"
];

export default function GoalsPanel({ isOpen, onClose, onGoalsUpdated }: GoalsPanelProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    priority: 'medium' as const
  });

  useEffect(() => {
    const storedGoals = localStorage.getItem('investmentGoals');
    if (storedGoals) {
      const parsedGoals = JSON.parse(storedGoals);
      setGoals(parsedGoals.map((goal: any) => ({ 
        ...goal, 
        targetDate: new Date(goal.targetDate), 
        createdAt: new Date(goal.createdAt) 
      })));
    }
  }, []);

  const saveGoals = (newGoals: Goal[]) => {
    console.log('💾 GoalsPanel: Saving goals:', newGoals);
    localStorage.setItem('investmentGoals', JSON.stringify(newGoals));
    setGoals(newGoals);
    onGoalsUpdated(newGoals);
    window.dispatchEvent(new Event('goals-updated'));
  };

  // Add new goal
  const addGoal = () => {
    if (!newGoal.name || !newGoal.targetAmount || !newGoal.targetDate) {
      alert('Please fill in all fields');
      return;
    }

    const newGoalObj: Goal = {
      id: Date.now().toString(),
      name: newGoal.name,
      category: 'custom',
      targetAmount: parseInt(newGoal.targetAmount),
      targetDate: new Date(newGoal.targetDate),
      priority: newGoal.priority,
      currentProgress: 0,
      isActive: true,
      createdAt: new Date()
    };

    const updatedGoals = [...goals, newGoalObj];
    saveGoals(updatedGoals);
    
    // Reset form
    setNewGoal({
      name: '',
      targetAmount: '',
      targetDate: '',
      priority: 'medium'
    });
  };

  // Delete goal
  const deleteGoal = (goalId: string) => {
    const updatedGoals = goals.filter(goal => goal.id !== goalId);
    saveGoals(updatedGoals);
  };

  // Toggle goal status
  const toggleGoalStatus = (goalId: string) => {
    const updatedGoals = goals.map(goal => 
      goal.id === goalId ? { ...goal, isActive: !goal.isActive } : goal
    );
    saveGoals(updatedGoals);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - only show when panel is open */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-[9998]" onClick={onClose} />
      )}
      
      {/* Panel - slides in from right */}
      <div className={`fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-[9999] transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Investment Goals</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {/* Add New Goal */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Goal</h3>
                <div className="space-y-3">
                  <select
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Choose goal type</option>
                    {COMMON_GOAL_NAMES.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    <option value="custom">Custom Goal</option>
                  </select>
                  
                  {newGoal.name === 'custom' && (
                    <input
                      type="text"
                      placeholder="Enter custom goal name"
                      value={newGoal.name === 'custom' ? '' : newGoal.name}
                      onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    />
                  )}
                  
                  <input
                    type="number"
                    placeholder="Target amount (₹)"
                    value={newGoal.targetAmount}
                    onChange={(e) => setNewGoal({...newGoal, targetAmount: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                  
                  <input
                    type="date"
                    value={newGoal.targetDate}
                    onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                  
                  <select
                    value={newGoal.priority}
                    onChange={(e) => setNewGoal({...newGoal, priority: e.target.value as any})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                  
                  <button 
                    onClick={addGoal}
                    className="w-full p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                  >
                    Save Goal
                  </button>
                </div>
              </div>

              {/* Your Goals */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Your Goals ({goals.length})</h3>
                
                {goals.length === 0 ? (
                  <p className="text-gray-500 text-sm">No goals added yet. Add your first investment goal!</p>
                ) : (
                  <div className="space-y-3">
                    {goals.map(goal => (
                      <div key={goal.id} className="p-3 border border-gray-200 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{goal.name}</span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              goal.priority === 'high' ? 'bg-red-100 text-red-800' :
                              goal.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {goal.priority}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => toggleGoalStatus(goal.id)}
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {goal.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button 
                              onClick={() => deleteGoal(goal.id)}
                              className="text-sm text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Target: ₹{goal.targetAmount.toLocaleString()}</div>
                          <div>Date: {goal.targetDate.toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
