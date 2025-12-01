import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Expense } from '@/types/expense';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ExpenseDayDialog } from './ExpenseDayDialog';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type TimeRange = 'daily' | 'weekly' | 'monthly';

export function ExpenseChart() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
  const [chartData, setChartData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (user) {
      loadExpenses();
    }
  }, [user, timeRange]);

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
          label: (context: any) => `$${context.parsed.y.toFixed(2)}`,
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
          callback: (value: any) => `$${value}`,
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
      <Card className="shadow-card">
        <CardHeader>
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
    </>
  );
}
