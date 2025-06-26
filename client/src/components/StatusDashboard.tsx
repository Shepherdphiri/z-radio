import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Radio, Users, Signal } from 'lucide-react';

interface StatsData {
  activeStreams: number;
  totalListeners: number;
  connectionQuality: string;
}

export function StatusDashboard() {
  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ['/api/stats'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Active Streams
            </CardTitle>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Radio className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-gray-900">
              {stats?.activeStreams ?? 0}
            </div>
            <div className="text-sm text-gray-600">Currently broadcasting</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Total Listeners
            </CardTitle>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-gray-900">
              {stats?.totalListeners ?? 0}
            </div>
            <div className="text-sm text-gray-600">Across all streams</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Connection Quality
            </CardTitle>
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Signal className="h-4 w-4 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-gray-900">
              {stats?.connectionQuality ?? '--'}
            </div>
            <div className="text-sm text-gray-600">Average latency</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
