import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { Question, PaginatedQuestions } from '@/types';

export default function ReviewQueue() {
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [rejectComment, setRejectComment] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingIds, setRejectingIds] = useState<number[]>([]);
  const [detailIndex, setDetailIndex] = useState(0);
  const [inlineRejectId, setInlineRejectId] = useState<number | null>(null);
  const [inlineComment, setInlineComment] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PaginatedQuestions>({
    queryKey: ['review-queue'],
    queryFn: async () => {
      const { data } = await api.get('/admin/questions', {
        params: { status: 'pending_review', limit: 100 },
      });
      return data;
    },
  });

  const questions = data?.questions ?? [];
  const currentQuestion = questions[detailIndex];

  const approveMutation = useMutation({
    mutationFn: (id: number) => api.post(`/admin/questions/${id}/approve`),
    onSuccess: () => {
      toast.success('Question approved');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) =>
      api.post(`/admin/questions/${id}/reject`, { comment }),
    onSuccess: () => {
      toast.success('Question rejected');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      setInlineRejectId(null);
      setInlineComment('');
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: number[]) => api.post('/admin/questions/bulk-approve', { ids }),
    onSuccess: (res) => {
      toast.success(`Approved ${res.data.approved} questions`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
  });

  const bulkRejectMutation = useMutation({
    mutationFn: ({ ids, comment }: { ids: number[]; comment: string }) =>
      api.post('/admin/questions/bulk-reject', { ids, comment }),
    onSuccess: (res) => {
      toast.success(`Rejected ${res.data.rejected} questions`);
      setSelectedIds(new Set());
      setShowRejectModal(false);
      setRejectComment('');
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
    },
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map((q) => q.id)));
    }
  };

  // Keyboard shortcuts for detail mode
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (viewMode !== 'detail' || !currentQuestion) return;
      if (inlineRejectId) return; // Don't handle when typing reject comment

      if (e.key === 'ArrowRight' && detailIndex < questions.length - 1) {
        setDetailIndex((i) => i + 1);
      } else if (e.key === 'ArrowLeft' && detailIndex > 0) {
        setDetailIndex((i) => i - 1);
      } else if (e.key === 'a' || e.key === 'A') {
        approveMutation.mutate(currentQuestion.id);
      } else if (e.key === 'r' || e.key === 'R') {
        setInlineRejectId(currentQuestion.id);
      }
    },
    [viewMode, currentQuestion, detailIndex, questions.length, inlineRejectId, approveMutation]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;

  if (!questions.length) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Review Queue</h1>
        <div className="text-muted-foreground text-center py-12">
          No questions pending review
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Review Queue ({questions.length})</h1>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
          <Button
            variant={viewMode === 'detail' ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setViewMode('detail'); setDetailIndex(0); }}
          >
            Detail
          </Button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          {selectedIds.size > 0 && (
            <div className="flex gap-2 mb-4">
              <Button
                size="sm"
                onClick={() => bulkApproveMutation.mutate([...selectedIds])}
                disabled={bulkApproveMutation.isPending}
              >
                Approve ({selectedIds.size})
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setRejectingIds([...selectedIds]);
                  setShowRejectModal(true);
                }}
              >
                Reject ({selectedIds.size})
              </Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedIds.size === questions.length && questions.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[350px]">Question</TableHead>
                <TableHead>Maker</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(q.id)}
                      onCheckedChange={() => toggleSelect(q.id)}
                    />
                  </TableCell>
                  <TableCell className="max-w-[350px] truncate">
                    {q.question_text.slice(0, 70)}...
                  </TableCell>
                  <TableCell className="text-sm">{q.created_by_name ?? '-'}</TableCell>
                  <TableCell>{q.topic_name ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{q.difficulty}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {q.submitted_at ? new Date(q.submitted_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(q.id)}
                        disabled={approveMutation.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setRejectingIds([q.id]);
                          setShowRejectModal(true);
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : (
        /* Detail view */
        currentQuestion && (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Question {detailIndex + 1} of {questions.length}
              </span>
              <span className="text-xs">
                Shortcuts: A = approve, R = reject, ← → = navigate
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>By: {currentQuestion.created_by_name ?? '-'}</span>
                <span>Topic: {currentQuestion.topic_name}</span>
                <Badge variant="outline" className="capitalize">{currentQuestion.difficulty}</Badge>
                {currentQuestion.year && <span>Year: {currentQuestion.year}</span>}
              </div>

              <div className="p-4 rounded-lg border border-border">
                <p className="font-medium mb-3">{currentQuestion.question_text}</p>
                {currentQuestion.statements.length > 0 && (
                  <ol className="list-decimal ml-5 mb-3 text-sm text-muted-foreground">
                    {currentQuestion.statements.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                )}

                <div className="grid gap-2 mt-4">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const key = `option_${opt.toLowerCase()}` as keyof Question;
                    const isCorrect = currentQuestion.correct_option === opt;
                    return (
                      <div
                        key={opt}
                        className={`p-3 rounded-md border text-sm ${
                          isCorrect
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-border'
                        }`}
                      >
                        <span className="font-medium">{opt}.</span>{' '}
                        {currentQuestion[key] as string}
                        {isCorrect && <span className="ml-2 text-green-400">(Correct)</span>}
                      </div>
                    );
                  })}
                </div>

                {currentQuestion.rationale && (
                  <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                    <strong>Rationale:</strong> {currentQuestion.rationale}
                  </div>
                )}
              </div>
            </div>

            {inlineRejectId === currentQuestion.id ? (
              <div className="space-y-2">
                <Textarea
                  value={inlineComment}
                  onChange={(e) => setInlineComment(e.target.value)}
                  placeholder="Reason for rejection..."
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!inlineComment.trim() || rejectMutation.isPending}
                    onClick={() =>
                      rejectMutation.mutate({ id: currentQuestion.id, comment: inlineComment })
                    }
                  >
                    Confirm Reject
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setInlineRejectId(null); setInlineComment(''); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <Button
                  disabled={detailIndex === 0}
                  variant="outline"
                  onClick={() => setDetailIndex((i) => i - 1)}
                >
                  Previous
                </Button>
                <Button
                  onClick={() => approveMutation.mutate(currentQuestion.id)}
                  disabled={approveMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setInlineRejectId(currentQuestion.id)}
                >
                  Reject
                </Button>
                <Button
                  disabled={detailIndex >= questions.length - 1}
                  variant="outline"
                  onClick={() => setDetailIndex((i) => i + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )
      )}

      {/* Bulk Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejectingIds.length} Question(s)</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="Reason for rejection..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectComment.trim() || bulkRejectMutation.isPending}
              onClick={() =>
                bulkRejectMutation.mutate({ ids: rejectingIds, comment: rejectComment })
              }
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
