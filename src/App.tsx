import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FileInput, Flame, TrendingUp } from 'lucide-react';

interface Task {
  status: string;
  taskName: string;
  assignee: string;
  due: string;
  user: string;
  userName?: string;
}

interface UserStats {
  user: string;
  currentStreak: number;
  longestStreak: number;
  totalTasks: number;
  completedTasks: number;
  currentStreakStart: Date | null;
  currentStreakEnd: Date | null;
}

const COLORS = ['#4CAF50', '#FFC107', '#F44336'];

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'currentStreak' | 'longestStreak'>('longestStreak');

  const parseJapaneseDate = (dateString: string): Date => {
    try {
      const match = dateString.match(/(\d+)年(\d+)月(\d+)日/);
      if (match) {
        const [, year, month, day] = match.map(Number);
        return new Date(year, month - 1, day);
      }
      return new Date(dateString);
    } catch (error) {
      console.error(`Error parsing date: ${dateString}`, error);
      return new Date();
    }
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      complete: (results) => {
        const headers = results.data[0] as string[];
        const userNameIndex = headers.findIndex(header => header.toLowerCase() === 'user_name');
        const parsedTasks: Task[] = results.data.slice(1).map((row: string[]) => {
          const taskName = row[headers.indexOf('Task name')];
          return {
            status: row[headers.indexOf('Status')],
            taskName: taskName,
            assignee: row[headers.indexOf('Assignee')],
            due: row[headers.indexOf('Due')],
            user: userNameIndex !== -1 && row[userNameIndex] ? row[userNameIndex] : taskName.split(':')[0].trim(),
            userName: userNameIndex !== -1 ? row[userNameIndex] : undefined
          };
        });
        setTasks(parsedTasks);
        analyzeTaskData(parsedTasks);
      },
      header: false,
    });
  };

  const analyzeTaskData = (filteredTasks: Task[]) => {
    const userStatsMap = new Map<string, UserStats>();

    filteredTasks.sort((a, b) => parseJapaneseDate(a.due).getTime() - parseJapaneseDate(b.due).getTime()).forEach((task) => {
      if (!userStatsMap.has(task.user)) {
        userStatsMap.set(task.user, {
          user: task.user,
          currentStreak: 0,
          longestStreak: 0,
          totalTasks: 0,
          completedTasks: 0,
          currentStreakStart: null,
          currentStreakEnd: null,
        });
      }

      const stats = userStatsMap.get(task.user)!;
      stats.totalTasks++;

      if (task.status === 'Done') {
        stats.completedTasks++;
        stats.currentStreak++;
        if (stats.currentStreak > stats.longestStreak) {
          stats.longestStreak = stats.currentStreak;
        }
        if (!stats.currentStreakStart) {
          stats.currentStreakStart = parseJapaneseDate(task.due);
        }
        stats.currentStreakEnd = parseJapaneseDate(task.due);
      } else if (task.status === 'Archived') {
        stats.currentStreak = 0;
        stats.currentStreakStart = null;
        stats.currentStreakEnd = null;
      }
    });

    setUserStats(Array.from(userStatsMap.values()));
  };

  useEffect(() => {
    if (tasks.length > 0) {
      const filteredTasks = tasks.filter((task) => {
        const taskDate = parseJapaneseDate(task.due);
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date(8640000000000000);
        return taskDate >= start && taskDate <= end;
      });
      analyzeTaskData(filteredTasks);
    }
  }, [tasks, startDate, endDate]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      parseCSV(file);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Task Analysis Dashboard</h1>
      <div className="mb-4">
        <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded cursor-pointer">
          <FileInput className="w-6 h-6 mr-2" />
          Upload CSV
          <input type="file" className="hidden" onChange={handleFileUpload} accept=".csv" />
        </label>
      </div>
      <div className="mb-4">
        <label className="mr-2">Start Date:</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border p-1 mr-4" />
        <label className="mr-2">End Date:</label>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border p-1" />
      </div>
      <div className="mb-4">
        <label className="mr-2">Sort by:</label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'currentStreak' | 'longestStreak')} className="border p-1">
          <option value="longestStreak">Longest Streak</option>
          <option value="currentStreak">Current Streak</option>
        </select>
      </div>
      {userStats.sort((a, b) => b[sortBy] - a[sortBy]).map((stats) => (
        <div key={stats.user} className="mb-8 p-4 border rounded">
          <h2 className="text-2xl font-bold mb-2">{stats.user}</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Current Streak</h3>
              <div className="flex items-center">
                <Flame className="w-6 h-6 mr-2 text-red-500" />
                <span className="text-3xl font-bold">{stats.currentStreak}</span>
              </div>
              {stats.currentStreakStart && stats.currentStreakEnd && (
                <p className="text-sm text-gray-600">
                  From {stats.currentStreakStart.toLocaleDateString()} to {stats.currentStreakEnd.toLocaleDateString()}
                </p>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Longest Streak</h3>
              <div className="flex items-center">
                <TrendingUp className="w-6 h-6 mr-2 text-green-500" />
                <span className="text-3xl font-bold">{stats.longestStreak}</span>
              </div>
            </div>
          </div>
          <div className="mb-4">
            <h3 className="text-xl font-semibold mb-2">Task Completion</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: stats.completedTasks },
                    { name: 'Remaining', value: stats.totalTasks - stats.completedTasks },
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Streak History</h3>
            <div className="flex items-center space-x-1">
              {Array.from({ length: stats.longestStreak }, (_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 ${
                    i < stats.currentStreak ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;