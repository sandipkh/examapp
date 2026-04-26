import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import type { PaginatedQuestions } from '@/types';

export default function ReviewedHistory() {
  const [filter, setFilter] = useState('published');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery<PaginatedQuestions>({
    queryKey: ['reviewed-history', filter, page],
    queryFn: async () => {
      const { data } = await api.get('/admin/questions', {
        params: { status: filter, page, limit: 20 },
      });
      return data;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Review History</h1>

      <Tabs value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
        <TabsList>
          <TabsTrigger value="published">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        {['published', 'rejected'].map((status) => (
          <TabsContent key={status} value={status}>
            {isLoading ? (
              <div className="text-muted-foreground py-8 text-center">Loading...</div>
            ) : !data?.questions.length ? (
              <div className="text-muted-foreground py-8 text-center">No questions found</div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[350px]">Question</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Maker</TableHead>
                      <TableHead>Date</TableHead>
                      {status === 'rejected' && <TableHead>Rejection Comment</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.questions.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="max-w-[350px] truncate">
                          {q.question_text.slice(0, 70)}...
                        </TableCell>
                        <TableCell>{q.topic_name ?? '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{q.difficulty}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{q.created_by_name ?? '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {q.reviewed_at ? new Date(q.reviewed_at).toLocaleDateString() : '-'}
                        </TableCell>
                        {status === 'rejected' && (
                          <TableCell className="text-sm text-red-400 max-w-[200px] truncate">
                            {q.rejection_comment ?? '-'}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    className="px-3 py-1 text-sm rounded border border-border disabled:opacity-50"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <button
                    className="px-3 py-1 text-sm rounded border border-border disabled:opacity-50"
                    disabled={!data.has_more}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
