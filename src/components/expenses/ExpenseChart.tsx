import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { formatINR } from '@/lib/utils';
import { Expense } from '@/types/expense';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ExpenseDayDialog } from './ExpenseDayDialog';
import { ExpenseItem } from './ExpenseItem';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type TimeRange = 'daily' | 'weekly' | 'monthly';

interface MonthOption {
  value: string;
  label: string;
  month: number;
  year: number;
}

export function ExpenseChart() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const [chartData, setChartData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState<number>(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState<Expense[]>([]);
  const [showMonthDialog, setShowMonthDialog] = useState(false);
  
  // Current month state - defaults to current month
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}`;
  });

  // Generate list of available months (current + past 11 months)
  const monthOptions = useMemo<MonthOption[]>(() => {
    const options: MonthOption[] = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = subMonths(now, i);
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthName = format(date, 'MMMM yyyy');
      
      options.push({
        value: `${year}-${month}`,
        label: monthName,
        month,
        year,
      });
    }
    
    return options;
  }, []);

  // Get current selected month details
  const currentMonthDetails = useMemo(() => {
    const option = monthOptions.find(opt => opt.value === selectedMonth);
    if (option) {
      return option;
    }
    // Fallback to current month
    const now = new Date();
    return {
      value: `${now.getFullYear()}-${now.getMonth()}`,
      label: format(now, 'MMMM yyyy'),
      month: now.getMonth(),
      year: now.getFullYear(),
    };
  }, [selectedMonth, monthOptions]);

  // Check if viewing current month
  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return currentMonthDetails.month === now.getMonth() && 
           currentMonthDetails.year === now.getFullYear();
  }, [currentMonthDetails]);

  useEffect(() => {
    if (user) {
      loadExpenses();
    }
  }, [user, timeRange]);

  // Real-time listener for selected month expenses
  useEffect(() => {
    if (!user) return;

    const monthStart = startOfMonth(new Date(currentMonthDetails.year, currentMonthDetails.month, 1));
    const monthEnd = endOfMonth(new Date(currentMonthDetails.year, currentMonthDetails.month, 1));

    const expensesRef = collection(db, 'users', user.uid, 'expenses');
    const q = query(
      expensesRef,
      where('date', '>=', monthStart),
      where('date', '<=', monthEnd),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const monthExpenses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Expense[];

      setMonthlyExpenses(monthExpenses);
      const total = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      setMonthlyTotal(total);
    }, (error) => {
      console.error('Error listening to monthly expenses:', error);
    });

    return () => unsubscribe();
  }, [user, currentMonthDetails]);

  // Auto-switch to current month when month changes
  useEffect(() => {
    const checkAndSwitchMonth = () => {
      const now = new Date();
      const currentMonthValue = `${now.getFullYear()}-${now.getMonth()}`;
      
      // If the selected month is not in our options anymore, switch to current month
      const exists = monthOptions.some(opt => opt.value === selectedMonth);
      if (!exists) {
        setSelectedMonth(currentMonthValue);
      }
    };
    
    // Check on mount and set up interval to check at midnight
    checkAndSwitchMonth();
    
    // Calculate time until next day
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const midnightTimeout = setTimeout(() => {
      checkAndSwitchMonth();
      // Set up daily interval after first midnight
      const dailyInterval = setInterval(checkAndSwitchMonth, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
    }, timeUntilMidnight);
    
    return () => clearTimeout(midnightTimeout);
  }, [monthOptions, selectedMonth]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const currentIndex = monthOptions.findIndex(opt => opt.value === selectedMonth);
    if (currentIndex < monthOptions.length - 1) {
      setSelectedMonth(monthOptions[currentIndex + 1].value);
    }
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const currentIndex = monthOptions.findIndex(opt => opt.value === selectedMonth);
    if (currentIndex > 0) {
      setSelectedMonth(monthOptions[currentIndex - 1].value);
    }
  };

  // Check if can navigate
  const canGoPrevious = monthOptions.findIndex(opt => opt.value === selectedMonth) < monthOptions.length - 1;
  const canGoNext = monthOptions.findIndex(opt => opt.value === selectedMonth) > 0;

  const loadExpenses = async () => {
    if (!user) return;

    try {
      const days = timeRange === 'daily' ? 7 : timeRange === 'weekly' ? 7 : 30;
      const startDate = startOfDay(subDays(new Date(), days - 1));

      const expensesRef = collection(db, 'users', user.uid, 'expenses');
      const q = query(
        expensesRef,
        where('date', '>=', startDate),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      const expensesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Expense[];

      setExpenses(expensesList);
      processChartData(expensesList, days);
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  };

  const processChartData = (expensesList: Expense[], days: number) => {
    const dailyTotals: { [key: string]: number } = {};

    // Initialize all days with 0
    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dailyTotals[date] = 0;
    }

    // Sum expenses by day
    expensesList.forEach((expense) => {
      const dateKey = format(expense.date, 'yyyy-MM-dd');
      if (dateKey in dailyTotals) {
        dailyTotals[dateKey] += expense.amount;
      }
    });

    const labels = Object.keys(dailyTotals).map((date) => format(new Date(date), 'MMM dd'));
    const data = Object.values(dailyTotals);

    setChartData({
      labels,
      datasets: [
        {
          label: 'Expenses',
          data,
          backgroundColor: 'hsl(var(--primary))',
          borderColor: 'hsl(var(--primary))',
          borderRadius: 8,
          barThickness: 24,
        },
      ],
    });
  };

  const handleBarClick = (event: any, elements: any) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const days = timeRange === 'daily' ? 7 : timeRange === 'weekly' ? 7 : 30;
      const date = format(subDays(new Date(), days - 1 - index), 'yyyy-MM-dd');
      setSelectedDate(date);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleBarClick,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'hsl(var(--card))',
        titleColor: 'hsl(var(--card-foreground))',
        bodyColor: 'hsl(var(--card-foreground))',
        borderColor: 'hsl(var(--border))',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => formatINR(context.parsed.y),
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'hsl(var(--border))',
          drawBorder: false,
        },
        ticks: {
          callback: (value: any) => formatINR(value),
          color: 'hsl(var(--muted-foreground))',
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: 'hsl(var(--muted-foreground))',
        },
      },
    },
  };

  return (
    <>
      <Card className="shadow-card hover-lift">
        <CardHeader>
          <div className="flex flex-col gap-4">
            {/* Month Selector */}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPreviousMonth}
                disabled={!canGoPrevious}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] text-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextMonth}
                disabled={!canGoNext}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Monthly Total - Clickable */}
            <Button
              variant="ghost"
              className="w-full p-4 h-auto flex flex-col items-start gap-1 hover:bg-primary/5 transition-smooth"
              onClick={() => setShowMonthDialog(true)}
            >
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total spent in {currentMonthDetails.label}
              </span>
              <span className="text-2xl font-bold text-primary">
                {formatINR(monthlyTotal)}
              </span>
              {monthlyExpenses.length === 0 && (
                <span className="text-xs text-muted-foreground italic">
                  No expenses for {currentMonthDetails.label} yet.
                </span>
              )}
              {monthlyExpenses.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {monthlyExpenses.length} expense{monthlyExpenses.length !== 1 ? 's' : ''} • Click to view details
                </span>
              )}
            </Button>

            {/* Spending Overview Header */}
            <div className="flex items-center justify-between">
              <CardTitle>Spending Overview</CardTitle>
              <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="daily">Daily</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            {chartData && <Bar data={chartData} options={options} />}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Tap on a bar to view expenses for that day
          </p>
        </CardContent>
      </Card>

      <ExpenseDayDialog
        date={selectedDate}
        expenses={expenses}
        open={!!selectedDate}
        onOpenChange={(open) => !open && setSelectedDate(null)}
      />

      {/* Monthly Expenses Dialog */}
      <Dialog open={showMonthDialog} onOpenChange={setShowMonthDialog}>
        <DialogContent className="max-w-md w-[95vw] max-h-[80vh] overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle>{currentMonthDetails.label} Expenses</DialogTitle>
            <DialogDescription>
              {monthlyExpenses.length} expense{monthlyExpenses.length !== 1 ? 's' : ''} • Total: {formatINR(monthlyTotal)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {monthlyExpenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No expenses for {currentMonthDetails.label} yet.
              </p>
            ) : (
              monthlyExpenses.map((expense) => (
                <ExpenseItem key={expense.id} expense={expense} onUpdate={() => {}} />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
