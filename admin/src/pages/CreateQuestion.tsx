import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { Topic, Question } from '@/types';

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const OPTIONS = ['A', 'B', 'C', 'D'] as const;

export default function CreateQuestion() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();

  const [form, setForm] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'A' as string,
    rationale: '',
    topic_slug: '',
    subtopic_name: '',
    difficulty: 'medium' as string,
    year: '',
  });
  const [showPreview, setShowPreview] = useState(false);

  const { data: topics } = useQuery<Topic[]>({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data } = await api.get('/admin/topics');
      return data;
    },
  });

  // Load existing question for editing
  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      try {
        const { data } = await api.get('/admin/questions', { params: { page: 1, limit: 1 } });
        // Find from list — need to search by ID
        const { data: allData } = await api.get('/admin/questions', { params: { limit: 100 } });
        const question = allData.questions.find((q: Question) => q.id === Number(id));
        if (question) {
          const topicSlug = topics?.find((t) => t.id === question.topic_id)?.slug ?? '';
          setForm({
            question_text: question.question_text,
            option_a: question.option_a,
            option_b: question.option_b,
            option_c: question.option_c,
            option_d: question.option_d,
            correct_option: question.correct_option,
            rationale: question.rationale ?? '',
            topic_slug: topicSlug,
            subtopic_name: '',
            difficulty: question.difficulty,
            year: question.year?.toString() ?? '',
          });
        }
      } catch {
        toast.error('Failed to load question');
      }
    })();
  }, [id, isEditing, topics]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = {
        ...data,
        year: data.year ? parseInt(data.year) : null,
        subtopic_name: data.subtopic_name || null,
        statements: [],
      };
      if (isEditing) {
        return api.put(`/admin/questions/${id}`, payload);
      }
      return api.post('/admin/questions', payload);
    },
    onSuccess: () => {
      toast.success(isEditing ? 'Question updated' : 'Question created as draft');
      navigate('/questions');
    },
    onError: () => toast.error('Failed to save question'),
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? 'Edit Question' : 'Create Question'}
      </h1>

      {showPreview ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-lg">Student Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-medium">{form.question_text || 'Question text...'}</p>
            <div className="grid gap-2">
              {OPTIONS.map((opt) => {
                const key = `option_${opt.toLowerCase()}` as keyof typeof form;
                return (
                  <div key={opt} className="p-3 rounded-md border border-border text-sm">
                    <span className="font-medium">{opt}.</span> {form[key] || '...'}
                  </div>
                );
              })}
            </div>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Back to Edit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate(form);
          }}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Label>Question Text</Label>
            <Textarea
              rows={4}
              value={form.question_text}
              onChange={(e) => handleChange('question_text', e.target.value)}
              placeholder="Enter the question text..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OPTIONS.map((opt) => {
              const key = `option_${opt.toLowerCase()}`;
              return (
                <div key={opt} className="space-y-2">
                  <Label>Option {opt}</Label>
                  <Input
                    value={form[key as keyof typeof form]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={`Option ${opt}`}
                    required
                  />
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label>Correct Option</Label>
            <div className="flex gap-4">
              {OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="correct_option"
                    value={opt}
                    checked={form.correct_option === opt}
                    onChange={(e) => handleChange('correct_option', e.target.value)}
                    className="accent-primary"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rationale</Label>
            <Textarea
              rows={3}
              value={form.rationale}
              onChange={(e) => handleChange('rationale', e.target.value)}
              placeholder="Explain the correct answer..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Topic</Label>
              <Select value={form.topic_slug} onValueChange={(v) => handleChange('topic_slug', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics?.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {t.icon} {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={(v) => handleChange('difficulty', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d} className="capitalize">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year (optional)</Label>
              <Input
                type="number"
                value={form.year}
                onChange={(e) => handleChange('year', e.target.value)}
                placeholder="e.g. 2023"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save as Draft'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowPreview(true)}>
              Preview
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/questions')}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
