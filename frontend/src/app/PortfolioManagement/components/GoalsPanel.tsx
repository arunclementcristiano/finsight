'use client';

import React, { useState, useEffect } from 'react';
import { Input } from "../../components/Input";
import { Button } from "../../components/Button";

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
    setNewGoal({ name: '', targetAmount: '', targetDate: '', priority: 'medium' });
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
      {/* Backdrop - subtle and blurred so plan remains visible */}
      <div className="fixed inset-0 z-[60] bg-black/20 dark:bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      {/* Panel */}
      <div className="fixed right-0 top-0 z-[61] h-full w-full md:w-[420px] border-l border-border bg-card text-foreground shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0">
            <h2 className="text-base font-semibold">Investment Goals</h2>
            <button onClick={onClose} className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted">✕</button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {/* Add New Goal */}
              <div className="rounded-lg border border-border bg-card p-3">
                <h3 className="text-sm font-medium mb-3">Add New Goal</h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1">Goal Type</div>
                    <select
                      value={newGoal.name}
                      onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                      className="w-full rounded border border-border bg-background px-2 py-2"
                    >
                      <option value="">Choose goal type</option>
                      {COMMON_GOAL_NAMES.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                      <option value="custom">Custom Goal</option>
                    </select>
                  </div>

                  {newGoal.name === 'custom' && (
                    <div>
                      <div className="text-[11px] text-muted-foreground mb-1">Custom Name</div>
                      <Input placeholder="Enter custom goal name" value={newGoal.name === 'custom' ? '' : newGoal.name} onChange={(e) => setNewGoal({...newGoal, name: e.target.value})} />
                    </div>
                  )}

                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1">Target amount (₹)</div>
                    <Input type="number" placeholder="0" value={newGoal.targetAmount} onChange={(e) => setNewGoal({...newGoal, targetAmount: e.target.value})} />
                  </div>

                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1">Target date</div>
                    <Input type="date" value={newGoal.targetDate} onChange={(e) => setNewGoal({...newGoal, targetDate: e.target.value})} />
                  </div>

                  <div>
                    <div className="text-[11px] text-muted-foreground mb-1">Priority</div>
                    <select
                      value={newGoal.priority}
                      onChange={(e) => setNewGoal({...newGoal, priority: e.target.value as any})}
                      className="w-full rounded border border-border bg-background px-2 py-2"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={addGoal}>Save Goal</Button>
                  </div>
                </div>
              </div>

              {/* Your Goals */}
              <div className="rounded-lg border border-border bg-card p-3">
                <h3 className="text-sm font-medium mb-3">Your Goals ({goals.length})</h3>
                {goals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No goals added yet. Add your first investment goal!</p>
                ) : (
                  <div className="space-y-2">
                    {goals.map(goal => (
                      <div key={goal.id} className="p-2 border border-border rounded-md">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <div className="text-[11px] text-muted-foreground mb-1">Name</div>
                            <Input value={goal.name} onChange={(e)=> {
                              const v = e.target.value; setGoals(prev=> prev.map(g=> g.id===goal.id? { ...g, name: v }: g));
                            }} />
                          </div>
                          <div>
                            <div className="text-[11px] text-muted-foreground mb-1">Target amount (₹)</div>
                            <Input type="number" value={goal.targetAmount} onChange={(e)=> {
                              const v = Number(e.target.value||0); setGoals(prev=> prev.map(g=> g.id===goal.id? { ...g, targetAmount: v }: g));
                            }} />
                          </div>
                          <div>
                            <div className="text-[11px] text-muted-foreground mb-1">Target date</div>
                            <Input type="date" value={new Date(goal.targetDate).toISOString().slice(0,10)} onChange={(e)=> {
                              const v = e.target.value; setGoals(prev=> prev.map(g=> g.id===goal.id? { ...g, targetDate: new Date(v) }: g));
                            }} />
                          </div>
                          <div>
                            <div className="text-[11px] text-muted-foreground mb-1">Priority</div>
                            <select value={goal.priority} onChange={(e)=> {
                              const v = e.target.value as any; setGoals(prev=> prev.map(g=> g.id===goal.id? { ...g, priority: v }: g));
                            }} className="w-full rounded border border-border bg-background px-2 py-2 text-sm">
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-[11px] text-muted-foreground">Created: {new Date(goal.createdAt).toLocaleDateString()}</div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={()=> saveGoals(goals)}>Save</Button>
                            <button 
                              onClick={() => toggleGoalStatus(goal.id)}
                              className="text-[11px] text-indigo-600 hover:underline"
                            >
                              {goal.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button 
                              onClick={() => deleteGoal(goal.id)}
                              className="text-[11px] text-rose-600 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
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
