const fs = require('fs');
const file = 'c:/dhostel-main/tenant-mobile/src/Pages/ExpensesScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldRegex = /export default function ExpensesScreen\(\{ navigation \}: any\) \{[\s\S]*?const recentExpenses = todayExpenses\.slice\(0, 4\);/m;

const newStr = `export default function ExpensesScreen({ navigation }: any) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addDefaultCat, setAddDefaultCat] = useState('Food');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Today');
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tenant-expenses');
      if (res.data?.success) {
        const formatted = res.data.data.map((e: any) => ({
          id: String(e.expense_id),
          title: e.title,
          category: e.category,
          amount: Number(e.amount),
          date: e.date.split('T')[0],
          time: new Date(e.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          note: e.note || ''
        }));
        setExpenses(formatted);
      }
    } catch (err) {
      console.error('Failed to fetch expenses', err);
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todayExpenses = expenses.filter((e) => e.date === todayStr);
  const total = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const pct = 43;
  const recentExpenses = todayExpenses.slice(0, 4);`;

content = content.replace(oldRegex, newStr);
fs.writeFileSync(file, content);
console.log('Replaced successfully');
