import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { Question, PaginatedQuestions } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-500/20 text-yellow-400',
  pending_review: 'bg-blue-500/20 text-blue-400',
  rejected: 'bg-red-500/20 text-red-400',
  published: 'bg-green-500/20 text-green-400',
  archived: 'bg-gray-500/20 text-gray-400',
};

function useQuestions(status: string, page: number) {
  return useQuery<PaginatedQuestions>({
    queryKey: ['questions', status, page],
    queryFn: async () => {
      const { data } = await api.get('/admin/questions', {
        params: { status, page, limit: 20 },
      });
      return data;
    },
  });
}

export default function MyQuestions() {
  const [tab, setTab] = useState('draft');
  const [page, setPage] = useState(1);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuestions(tab, page);

  const submitMutation = useMutation({
    mutationFn: (id: number) => api.post(`/admin/questions/${id}/submit`),
    onSuccess: () => {
      toast.success('Question submitted for review');
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: () => toast.error('Failed to submit'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/questions/${id}`),
    onSuccess: () => {
      toast.success('Question archived');
      queryClient.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const handleTabChange = (value: string) => {
    setTab(value);
    setPage(1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Questions</h1>
        <Button onClick={() => navigate('/questions/create')}>Create Question</Button>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="pending_review">Pending Review</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
        </TabsList>

        {['draft', 'pending_review', 'rejected', 'published'].map((status) => (
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
                      <TableHead className="w-[400px]">Question</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.questions.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell
                          className="max-w-[400px] truncate cursor-pointer hover:text-primary"
                          onClick={() => setPreviewQuestion(q)}
                        >
                          {q.question_text.slice(0, 80)}...
                        </TableCell>
                        <TableCell>{q.topic_name ?? '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {q.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[q.status] ?? ''}`}>
                            {q.status.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(q.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {(status === 'draft' || status === 'rejected') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/questions/${q.id}/edit`)}
                              >
                                Edit
                              </Button>
                            )}
                            {status === 'draft' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => submitMutation.mutate(q.id)}
                                  disabled={submitMutation.isPending}
                                >
                                  Submit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => deleteMutation.mutate(q.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                            {status === 'rejected' && (
                              <Button
                                size="sm"
                                onClick={() => submitMutation.mutate(q.id)}
                                disabled={submitMutation.isPending}
                              >
                                Resubmit
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm text-muted-foreground">
                    Total: {data.total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!data.has_more}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={!!previewQuestion} onOpenChange={() => setPreviewQuestion(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
          </DialogHeader>
          {previewQuestion && (
            <div className="space-y-4">
              {previewQuestion.rejection_comment && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-md p-3 text-sm">
                  <strong>Rejection reason:</strong> {previewQuestion.rejection_comment}
                </div>
              )}
              <div>
                <p className="font-medium mb-2">{previewQuestion.question_text}</p>
                {previewQuestion.statements.length > 0 && (
                  <ol className="list-decimal ml-5 mb-3 text-sm text-muted-foreground">
                    {previewQuestion.statements.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                  const key = `option_${opt.toLowerCase()}` as keyof Question;
                  const isCorrect = previewQuestion.correct_option === opt;
                  return (
                    <div
                      key={opt}
                      className={`p-3 rounded-md border text-sm ${
                        isCorrect
                          ? 'border-green-500 bg-green-500/10 text-green-400'
                          : 'border-border'
                      }`}
                    >
                      <span className="font-medium">{opt}.</span>{' '}
                      {previewQuestion[key] as string}
                    </div>
                  );
                })}
              </div>
              {previewQuestion.rationale && (
                <div className="bg-muted p-3 rounded-md text-sm">
                  <strong>Rationale:</strong> {previewQuestion.rationale}
                </div>
              )}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Topic: {previewQuestion.topic_name}</span>
                <span>Difficulty: {previewQuestion.difficulty}</span>
                {previewQuestion.year && <span>Year: {previewQuestion.year}</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
