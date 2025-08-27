'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/Select';
import { Badge } from '../../components/Badge';

// Redirect this page to Plan with goals panel open to unify the flow
if (typeof window !== 'undefined') {
  window.location.replace('/PortfolioManagement/Plan?goals=open');
}

export default function GoalsPage() {
  // Render nothing (legacy content kept for reference but unreachable)
  return null;
}
