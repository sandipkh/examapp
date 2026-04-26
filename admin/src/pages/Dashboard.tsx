import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import type { OverviewStats } from '@/types';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<OverviewStats>({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      const { data } = await api.get('/admin/analytics/overview');
      return data;
    },
  });

  const cards = [
    { title: 'Total Users', value: stats?.total_users ?? 0 },
    { title: 'Active Today', value: stats?.active_today ?? 0 },
    { title: 'Total Questions', value: stats?.total_questions ?? 0 },
    { title: 'Published Questions', value: stats?.published_questions ?? 0 },
    { title: 'Total Subscriptions', value: stats?.total_subscriptions ?? 0 },
    { title: 'Active Subscriptions', value: stats?.active_subscriptions ?? 0 },
  ];

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
