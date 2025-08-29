'use client';
import React, { useState } from 'react';
import { 
  Plus, 
  TrendingUp, 
  Building, 
  Coins, 
  DollarSign, 
  Home,
  Landmark,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

type InstrumentType = 'stocks' | 'mutual_funds' | 'debt_bonds' | 'liquid_fd' | 'gold' | 'real_estate';

interface BaseHolding {
  id: string;
  instrumentType: InstrumentType;
  createdAt: string;
}

interface StockHolding extends BaseHolding {
  instrumentType: 'stocks';
  companyName: string;
  stockSymbol: string;
  unitsHeld: number;
  buyPrice: number;
  purchaseDate: string;
}

interface MutualFundHolding extends BaseHolding {
  instrumentType: 'mutual_funds';
  fundName: string;
  fundType: string;
  unitsOrAmount: number;
  navAtPurchase: number;
  purchaseDate: string;
}

interface DebtBondHolding extends BaseHolding {
  instrumentType: 'debt_bonds';
  bondName: string;
  issuer: string;
  faceValue: number;
  unitsPurchased: number;
  couponRate: number;
  maturityDate: string;
}

interface LiquidFDHolding extends BaseHolding {
  instrumentType: 'liquid_fd';
  bankName: string;
  depositAmount: number;
  interestRate: number;
  tenure: number;
  maturityDate: string;
}

interface GoldHolding extends BaseHolding {
  instrumentType: 'gold';
  goldType: string;
  quantity: number;
  buyPrice: number;
  purchaseDate: string;
}

interface RealEstateHolding extends BaseHolding {
  instrumentType: 'real_estate';
  propertyName: string;
  location: string;
  purchaseValue: number;
  currentValue: number;
  rentalIncome: number;
  purchaseDate: string;
}

type PortfolioHolding = StockHolding | MutualFundHolding | DebtBondHolding | LiquidFDHolding | GoldHolding | RealEstateHolding;

const instruments = [
  { id: 'stocks', name: 'Stocks', icon: TrendingUp, color: 'bg-blue-500', textColor: 'text-blue-600' },
  { id: 'mutual_funds', name: 'Mutual Funds', icon: Building, color: 'bg-green-500', textColor: 'text-green-600' },
  { id: 'debt_bonds', name: 'Debt/Bonds', icon: DollarSign, color: 'bg-purple-500', textColor: 'text-purple-600' },
  { id: 'liquid_fd', name: 'Liquid/FD', icon: Landmark, color: 'bg-orange-500', textColor: 'text-orange-600' },
  { id: 'gold', name: 'Gold', icon: Coins, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  { id: 'real_estate', name: 'Real Estate', icon: Home, color: 'bg-red-500', textColor: 'text-red-600' },
];

export default function PortfolioHoldingsDashboard() {
  const [portfolioHoldings, setPortfolioHoldings] = useState<PortfolioHolding[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>('stocks');
  const [showModal, setShowModal] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<InstrumentType>>(new Set(['stocks']));
  const [editingHolding, setEditingHolding] = useState<PortfolioHolding | null>(null);

  // Form state for different instruments
  const [stockForm, setStockForm] = useState({
    companyName: '', stockSymbol: '', unitsHeld: '', buyPrice: '', purchaseDate: ''
  });
  const [mutualFundForm, setMutualFundForm] = useState({
    fundName: '', fundType: '', unitsOrAmount: '', navAtPurchase: '', purchaseDate: ''
  });
  const [debtBondForm, setDebtBondForm] = useState({
    bondName: '', issuer: '', faceValue: '', unitsPurchased: '', couponRate: '', maturityDate: ''
  });
  const [liquidFDForm, setLiquidFDForm] = useState({
    bankName: '', depositAmount: '', interestRate: '', tenure: '', maturityDate: ''
  });
  const [goldForm, setGoldForm] = useState({
    goldType: '', quantity: '', buyPrice: '', purchaseDate: ''
  });
  const [realEstateForm, setRealEstateForm] = useState({
    propertyName: '', location: '', purchaseValue: '', currentValue: '', rentalIncome: '', purchaseDate: ''
  });

  const resetForms = () => {
    setStockForm({ companyName: '', stockSymbol: '', unitsHeld: '', buyPrice: '', purchaseDate: '' });
    setMutualFundForm({ fundName: '', fundType: '', unitsOrAmount: '', navAtPurchase: '', purchaseDate: '' });
    setDebtBondForm({ bondName: '', issuer: '', faceValue: '', unitsPurchased: '', couponRate: '', maturityDate: '' });
    setLiquidFDForm({ bankName: '', depositAmount: '', interestRate: '', tenure: '', maturityDate: '' });
    setGoldForm({ goldType: '', quantity: '', buyPrice: '', purchaseDate: '' });
    setRealEstateForm({ propertyName: '', location: '', purchaseValue: '', currentValue: '', rentalIncome: '', purchaseDate: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const baseHolding = {
      id: editingHolding?.id || Date.now().toString(),
      createdAt: editingHolding?.createdAt || new Date().toISOString(),
      instrumentType: selectedInstrument,
    };

    let newHolding: PortfolioHolding;

    switch (selectedInstrument) {
      case 'stocks':
        newHolding = {
          ...baseHolding,
          instrumentType: 'stocks',
          companyName: stockForm.companyName,
          stockSymbol: stockForm.stockSymbol,
          unitsHeld: parseFloat(stockForm.unitsHeld),
          buyPrice: parseFloat(stockForm.buyPrice),
          purchaseDate: stockForm.purchaseDate,
        } as StockHolding;
        break;
      case 'mutual_funds':
        newHolding = {
          ...baseHolding,
          instrumentType: 'mutual_funds',
          fundName: mutualFundForm.fundName,
          fundType: mutualFundForm.fundType,
          unitsOrAmount: parseFloat(mutualFundForm.unitsOrAmount),
          navAtPurchase: parseFloat(mutualFundForm.navAtPurchase),
          purchaseDate: mutualFundForm.purchaseDate,
        } as MutualFundHolding;
        break;
      case 'debt_bonds':
        newHolding = {
          ...baseHolding,
          instrumentType: 'debt_bonds',
          bondName: debtBondForm.bondName,
          issuer: debtBondForm.issuer,
          faceValue: parseFloat(debtBondForm.faceValue),
          unitsPurchased: parseFloat(debtBondForm.unitsPurchased),
          couponRate: parseFloat(debtBondForm.couponRate),
          maturityDate: debtBondForm.maturityDate,
        } as DebtBondHolding;
        break;
      case 'liquid_fd':
        newHolding = {
          ...baseHolding,
          instrumentType: 'liquid_fd',
          bankName: liquidFDForm.bankName,
          depositAmount: parseFloat(liquidFDForm.depositAmount),
          interestRate: parseFloat(liquidFDForm.interestRate),
          tenure: parseFloat(liquidFDForm.tenure),
          maturityDate: liquidFDForm.maturityDate,
        } as LiquidFDHolding;
        break;
      case 'gold':
        newHolding = {
          ...baseHolding,
          instrumentType: 'gold',
          goldType: goldForm.goldType,
          quantity: parseFloat(goldForm.quantity),
          buyPrice: parseFloat(goldForm.buyPrice),
          purchaseDate: goldForm.purchaseDate,
        } as GoldHolding;
        break;
      case 'real_estate':
        newHolding = {
          ...baseHolding,
          instrumentType: 'real_estate',
          propertyName: realEstateForm.propertyName,
          location: realEstateForm.location,
          purchaseValue: parseFloat(realEstateForm.purchaseValue),
          currentValue: parseFloat(realEstateForm.currentValue),
          rentalIncome: parseFloat(realEstateForm.rentalIncome || '0'),
          purchaseDate: realEstateForm.purchaseDate,
        } as RealEstateHolding;
        break;
      default:
        return;
    }

    if (editingHolding) {
      setPortfolioHoldings(prev => prev.map(h => h.id === editingHolding.id ? newHolding : h));
    } else {
      setPortfolioHoldings(prev => [...prev, newHolding]);
    }

    setShowModal(false);
    setEditingHolding(null);
    resetForms();
  };

  const deleteHolding = (id: string) => {
    setPortfolioHoldings(prev => prev.filter(h => h.id !== id));
  };

  const editHolding = (holding: PortfolioHolding) => {
    setEditingHolding(holding);
    setSelectedInstrument(holding.instrumentType);
    
    // Populate forms based on type
    switch (holding.instrumentType) {
      case 'stocks':
        const stock = holding as StockHolding;
        setStockForm({
          companyName: stock.companyName,
          stockSymbol: stock.stockSymbol,
          unitsHeld: stock.unitsHeld.toString(),
          buyPrice: stock.buyPrice.toString(),
          purchaseDate: stock.purchaseDate,
        });
        break;
      // Add other cases as needed
    }
    
    setShowModal(true);
  };

  const toggleGroup = (instrumentType: InstrumentType) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(instrumentType)) {
        newSet.delete(instrumentType);
      } else {
        newSet.add(instrumentType);
      }
      return newSet;
    });
  };

  const getHoldingsByInstrument = (instrumentType: InstrumentType) => {
    return portfolioHoldings.filter(h => h.instrumentType === instrumentType);
  };

  const calculatePortfolioValue = () => {
    return portfolioHoldings.reduce((total, holding) => {
      switch (holding.instrumentType) {
        case 'stocks':
          const stock = holding as StockHolding;
          return total + (stock.unitsHeld * stock.buyPrice);
        case 'mutual_funds':
          const mf = holding as MutualFundHolding;
          return total + (mf.unitsOrAmount * mf.navAtPurchase);
        case 'debt_bonds':
          const bond = holding as DebtBondHolding;
          return total + (bond.unitsPurchased * bond.faceValue);
        case 'liquid_fd':
          const fd = holding as LiquidFDHolding;
          return total + fd.depositAmount;
        case 'gold':
          const gold = holding as GoldHolding;
          return total + (gold.quantity * gold.buyPrice);
        case 'real_estate':
          const re = holding as RealEstateHolding;
          return total + re.currentValue;
        default:
          return total;
      }
    }, 0);
  };

  const getChartData = () => {
    const data: { [key: string]: number } = {};
    
    portfolioHoldings.forEach(holding => {
      const instrument = instruments.find(i => i.id === holding.instrumentType);
      if (!instrument) return;
      
      let value = 0;
      switch (holding.instrumentType) {
        case 'stocks':
          const stock = holding as StockHolding;
          value = stock.unitsHeld * stock.buyPrice;
          break;
        case 'mutual_funds':
          const mf = holding as MutualFundHolding;
          value = mf.unitsOrAmount * mf.navAtPurchase;
          break;
        case 'debt_bonds':
          const bond = holding as DebtBondHolding;
          value = bond.unitsPurchased * bond.faceValue;
          break;
        case 'liquid_fd':
          const fd = holding as LiquidFDHolding;
          value = fd.depositAmount;
          break;
        case 'gold':
          const gold = holding as GoldHolding;
          value = gold.quantity * gold.buyPrice;
          break;
        case 'real_estate':
          const re = holding as RealEstateHolding;
          value = re.currentValue;
          break;
      }
      
      data[instrument.name] = (data[instrument.name] || 0) + value;
    });

    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1'];
    
    return Object.entries(data).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }));
  };

  const renderDynamicForm = () => {
    switch (selectedInstrument) {
      case 'stocks':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={stockForm.companyName}
                  onChange={e => setStockForm({...stockForm, companyName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stock Symbol
                </label>
                <input
                  type="text"
                  value={stockForm.stockSymbol}
                  onChange={e => setStockForm({...stockForm, stockSymbol: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Units Held
                </label>
                <input
                  type="number"
                  value={stockForm.unitsHeld}
                  onChange={e => setStockForm({...stockForm, unitsHeld: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Buy Price (₹)
                </label>
                <input
                  type="number"
                  value={stockForm.buyPrice}
                  onChange={e => setStockForm({...stockForm, buyPrice: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Purchase Date
              </label>
              <input
                type="date"
                value={stockForm.purchaseDate}
                onChange={e => setStockForm({...stockForm, purchaseDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>
        );

      case 'mutual_funds':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fund Name
              </label>
              <input
                type="text"
                value={mutualFundForm.fundName}
                onChange={e => setMutualFundForm({...mutualFundForm, fundName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fund Type
              </label>
              <select
                value={mutualFundForm.fundType}
                onChange={e => setMutualFundForm({...mutualFundForm, fundType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select Fund Type</option>
                <option value="Equity">Equity</option>
                <option value="Debt">Debt</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Index">Index</option>
                <option value="ELSS">ELSS</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Units/Amount Invested
                </label>
                <input
                  type="number"
                  value={mutualFundForm.unitsOrAmount}
                  onChange={e => setMutualFundForm({...mutualFundForm, unitsOrAmount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  NAV at Purchase
                </label>
                <input
                  type="number"
                  value={mutualFundForm.navAtPurchase}
                  onChange={e => setMutualFundForm({...mutualFundForm, navAtPurchase: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Purchase Date
              </label>
              <input
                type="date"
                value={mutualFundForm.purchaseDate}
                onChange={e => setMutualFundForm({...mutualFundForm, purchaseDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>
        );

      case 'debt_bonds':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bond Name
              </label>
              <input
                type="text"
                value={debtBondForm.bondName}
                onChange={e => setDebtBondForm({...debtBondForm, bondName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Issuer
              </label>
              <input
                type="text"
                value={debtBondForm.issuer}
                onChange={e => setDebtBondForm({...debtBondForm, issuer: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Face Value (₹)
                </label>
                <input
                  type="number"
                  value={debtBondForm.faceValue}
                  onChange={e => setDebtBondForm({...debtBondForm, faceValue: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Units Purchased
                </label>
                <input
                  type="number"
                  value={debtBondForm.unitsPurchased}
                  onChange={e => setDebtBondForm({...debtBondForm, unitsPurchased: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Coupon Rate (%)
                </label>
                <input
                  type="number"
                  value={debtBondForm.couponRate}
                  onChange={e => setDebtBondForm({...debtBondForm, couponRate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maturity Date
                </label>
                <input
                  type="date"
                  value={debtBondForm.maturityDate}
                  onChange={e => setDebtBondForm({...debtBondForm, maturityDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
          </div>
        );

      case 'liquid_fd':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bank/Institution Name
              </label>
              <input
                type="text"
                value={liquidFDForm.bankName}
                onChange={e => setLiquidFDForm({...liquidFDForm, bankName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deposit Amount (₹)
              </label>
              <input
                type="number"
                value={liquidFDForm.depositAmount}
                onChange={e => setLiquidFDForm({...liquidFDForm, depositAmount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interest Rate (%)
                </label>
                <input
                  type="number"
                  value={liquidFDForm.interestRate}
                  onChange={e => setLiquidFDForm({...liquidFDForm, interestRate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tenure (months)
                </label>
                <input
                  type="number"
                  value={liquidFDForm.tenure}
                  onChange={e => setLiquidFDForm({...liquidFDForm, tenure: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maturity Date
              </label>
              <input
                type="date"
                value={liquidFDForm.maturityDate}
                onChange={e => setLiquidFDForm({...liquidFDForm, maturityDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>
        );

      case 'gold':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Gold Type
              </label>
              <select
                value={goldForm.goldType}
                onChange={e => setGoldForm({...goldForm, goldType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select Gold Type</option>
                <option value="Physical">Physical Gold</option>
                <option value="ETF">Gold ETF</option>
                <option value="Digital Gold">Digital Gold</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity (grams/units)
                </label>
                <input
                  type="number"
                  value={goldForm.quantity}
                  onChange={e => setGoldForm({...goldForm, quantity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Buy Price (₹)
                </label>
                <input
                  type="number"
                  value={goldForm.buyPrice}
                  onChange={e => setGoldForm({...goldForm, buyPrice: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Purchase Date
              </label>
              <input
                type="date"
                value={goldForm.purchaseDate}
                onChange={e => setGoldForm({...goldForm, purchaseDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>
        );

      case 'real_estate':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Property Name
              </label>
              <input
                type="text"
                value={realEstateForm.propertyName}
                onChange={e => setRealEstateForm({...realEstateForm, propertyName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={realEstateForm.location}
                onChange={e => setRealEstateForm({...realEstateForm, location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Purchase Value (₹)
                </label>
                <input
                  type="number"
                  value={realEstateForm.purchaseValue}
                  onChange={e => setRealEstateForm({...realEstateForm, purchaseValue: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Value (₹)
                </label>
                <input
                  type="number"
                  value={realEstateForm.currentValue}
                  onChange={e => setRealEstateForm({...realEstateForm, currentValue: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rental Income (₹/month)
                </label>
                <input
                  type="number"
                  value={realEstateForm.rentalIncome}
                  onChange={e => setRealEstateForm({...realEstateForm, rentalIncome: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={realEstateForm.purchaseDate}
                  onChange={e => setRealEstateForm({...realEstateForm, purchaseDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
          </div>
        );

      // Add other instrument forms here...
      default:
        return <div>Form for {selectedInstrument} coming soon...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Portfolio</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Track and manage all your investments in one place</p>
            </div>
            <button
              onClick={() => {
                setEditingHolding(null);
                resetForms();
                setShowModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors shadow-lg"
            >
              <Plus size={20} />
              <span>Add Holding</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Sidebar - Instrument Picker */}
          <div className="col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Instruments</h3>
              <div className="space-y-2">
                {instruments.map(instrument => {
                  const Icon = instrument.icon;
                  const count = getHoldingsByInstrument(instrument.id as InstrumentType).length;
                  return (
                    <button
                      key={instrument.id}
                      onClick={() => setSelectedInstrument(instrument.id as InstrumentType)}
                      className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                        selectedInstrument === instrument.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${instrument.color} text-white`}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white text-sm">
                              {instrument.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {count} holdings
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center Panel - Dynamic Form */}
          <div className="col-span-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add {instruments.find(i => i.id === selectedInstrument)?.name}
              </h3>
              <form onSubmit={handleSubmit}>
                {renderDynamicForm()}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => resetForms()}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Holding
                  </button>
                </div>
              </form>
            </div>

            {/* Holdings Table View */}
            {portfolioHoldings.length > 0 && (
              <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Holdings</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {portfolioHoldings.length} total holdings
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {portfolioHoldings.map(holding => {
                        const instrument = instruments.find(i => i.id === holding.instrumentType);
                        const Icon = instrument?.icon || TrendingUp;
                        
                        let value = 0;
                        let details = '';
                        let date = '';
                        
                        switch (holding.instrumentType) {
                          case 'stocks':
                            const stock = holding as StockHolding;
                            value = stock.unitsHeld * stock.buyPrice;
                            details = `${stock.stockSymbol} • ${stock.unitsHeld} units @ ₹${stock.buyPrice}`;
                            date = stock.purchaseDate;
                            break;
                          case 'mutual_funds':
                            const mf = holding as MutualFundHolding;
                            value = mf.unitsOrAmount * mf.navAtPurchase;
                            details = `${mf.fundType} • ${mf.unitsOrAmount} units @ NAV ₹${mf.navAtPurchase}`;
                            date = mf.purchaseDate;
                            break;
                          case 'debt_bonds':
                            const bond = holding as DebtBondHolding;
                            value = bond.unitsPurchased * bond.faceValue;
                            details = `${bond.issuer} • ${bond.unitsPurchased} units @ ₹${bond.faceValue} • ${bond.couponRate}%`;
                            date = bond.maturityDate;
                            break;
                          case 'liquid_fd':
                            const fd = holding as LiquidFDHolding;
                            value = fd.depositAmount;
                            details = `${fd.bankName} • ${fd.interestRate}% • ${fd.tenure} months`;
                            date = fd.maturityDate;
                            break;
                          case 'gold':
                            const gold = holding as GoldHolding;
                            value = gold.quantity * gold.buyPrice;
                            details = `${gold.goldType} • ${gold.quantity} grams @ ₹${gold.buyPrice}`;
                            date = gold.purchaseDate;
                            break;
                          case 'real_estate':
                            const re = holding as RealEstateHolding;
                            value = re.currentValue;
                            details = `${re.location} • Purchase: ₹${re.purchaseValue.toLocaleString()}`;
                            date = re.purchaseDate;
                            break;
                        }
                        
                        return (
                          <tr key={holding.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${instrument?.color || 'bg-gray-500'} text-white`}>
                                  <Icon size={16} />
                                </div>
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {instrument?.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {holding.instrumentType === 'stocks' && (holding as StockHolding).companyName}
                                {holding.instrumentType === 'mutual_funds' && (holding as MutualFundHolding).fundName}
                                {holding.instrumentType === 'debt_bonds' && (holding as DebtBondHolding).bondName}
                                {holding.instrumentType === 'liquid_fd' && (holding as LiquidFDHolding).bankName}
                                {holding.instrumentType === 'gold' && 'Gold Investment'}
                                {holding.instrumentType === 'real_estate' && (holding as RealEstateHolding).propertyName}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {details}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                                ₹{value.toLocaleString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {new Date(date).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => editHolding(holding)}
                                  className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => deleteHolding(holding.id)}
                                  className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Portfolio Summary */}
          <div className="col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Portfolio Summary</h3>
              
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  ₹{calculatePortfolioValue().toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Portfolio Value</div>
              </div>

              {portfolioHoldings.length > 0 && (
                <div className="h-64 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getChartData()}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                      >
                        {getChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Value']}
                        contentStyle={{
                          backgroundColor: 'rgb(31, 41, 55)',
                          border: '1px solid rgb(75, 85, 99)',
                          borderRadius: '8px',
                          color: 'white'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="space-y-3">
                {instruments.map(instrument => {
                  const holdings = getHoldingsByInstrument(instrument.id as InstrumentType);
                  if (holdings.length === 0) return null;

                  const Icon = instrument.icon;
                  return (
                    <div key={instrument.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-1 rounded ${instrument.color} text-white`}>
                          <Icon size={12} />
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{instrument.name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {holdings.length}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingHolding ? 'Edit' : 'Add'} {instruments.find(i => i.id === selectedInstrument)?.name}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Instrument Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select Instrument Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {instruments.map(instrument => {
                    const Icon = instrument.icon;
                    return (
                      <button
                        key={instrument.id}
                        type="button"
                        onClick={() => setSelectedInstrument(instrument.id as InstrumentType)}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                          selectedInstrument === instrument.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <div className="flex flex-col items-center space-y-2">
                          <div className={`p-2 rounded-lg ${instrument.color} text-white`}>
                            <Icon size={20} />
                          </div>
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {instrument.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {renderDynamicForm()}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingHolding ? 'Update' : 'Add'} Holding
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}