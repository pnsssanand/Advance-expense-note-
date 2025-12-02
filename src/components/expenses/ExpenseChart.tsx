import { useEffect, useState } from 'react';
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
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { ExpenseDayDialog } from './ExpenseDayDialog';
import { ExpenseItem } from './ExpenseItem';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type TimeRange = 'daily' | 'weekly' | 'monthly';

export function ExpenseChart() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const [chartData, setChartData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [decemberTotal, setDecemberTotal] = useState<number>(0);
  const [decemberExpenses, setDecemberExpenses] = useState<Expense[]>([]);
  const [showDecemberDialog, setShowDecemberDialog] = useState(false);

  useEffect(() => {
    if (user) {
      loadExpenses();
    }
  }, [user, timeRange]);

  // Real-time listener for December expenses
  useEffect(() => {
    if (!user) return;

    const currentYear = new Date().getFullYear();
    const decemberStart = startOfMonth(new Date(currentYear, 11, 1)); // December is month 11
    const decemberEnd = endOfMonth(new Date(currentYear, 11, 1));

    const expensesRef = collection(db, 'users', user.uid, 'expenses');
    const q = query(
      expensesRef,
      where('date', '>=', decemberStart),
      where('date', '<=', decemberEnd),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const decExpenses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as Expense[];

      setDecemberExpenses(decExpenses);
      const total = decExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      setDecemberTotal(total);
    }, (error) => {
      console.error('Error listening to December expenses:', error);
    });

    return () => unsubscribe();
  }, [user]);

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
            {/* December Total - Clickable */}
            <Button
              variant="ghost"
              className="w-full p-4 h-auto flex flex-col items-start gap-1 hover:bg-primary/5 transition-smooth"
              onClick={() => setShowDecemberDialog(true)}
            >
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Total spent in December
              </span>
              <span className="text-2xl font-bold text-primary">
                {formatINR(decemberTotal)}
              </span>
              {decemberExpenses.length === 0 && (
                <span className="text-xs text-muted-foreground italic">
                  No expenses for December yet.
                </span>
              )}
              {decemberExpenses.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {decemberExpenses.length} expense{decemberExpenses.length !== 1 ? 's' : ''} • Click to view details
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

      {/* December Expenses Dialog */}
      <Dialog open={showDecemberDialog} onOpenChange={setShowDecemberDialog}>
        <DialogContent className="max-w-md w-[95vw] max-h-[80vh] overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle>December {new Date().getFullYear()} Expenses</DialogTitle>
            <DialogDescription>
              {decemberExpenses.length} expense{decemberExpenses.length !== 1 ? 's' : ''} • Total: {formatINR(decemberTotal)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            {decemberExpenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No expenses for December yet.
              </p>
            ) : (
              decemberExpenses.map((expense) => (
                <ExpenseItem key={expense.id} expense={expense} onUpdate={() => {}} />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
