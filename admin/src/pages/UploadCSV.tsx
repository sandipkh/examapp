import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { toast } from 'sonner';
import type { BulkImportResult } from '@/types';

const CSV_TEMPLATE = `question_text,option_a,option_b,option_c,option_d,correct_option,rationale,topic_slug,difficulty,year
"Which article deals with Right to Equality?","Article 14","Article 19","Article 21","Article 32",A,"Article 14 guarantees equality before law",polity,easy,2023`;

export default function UploadCSV() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const navigate = useNavigate();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith('.csv')) {
      setFile(dropped);
    } else {
      toast.error('Please upload a CSV file');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/admin/questions/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      toast.success(`Imported ${data.imported} questions`);
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Upload CSV</h1>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-md bg-green-500/10 border border-green-500/30">
                <div className="text-2xl font-bold text-green-400">{result.imported}</div>
                <div className="text-sm text-green-400/70">Successfully imported</div>
              </div>
              <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30">
                <div className="text-2xl font-bold text-red-400">{result.failed}</div>
                <div className="text-sm text-red-400/70">Failed rows</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-red-400">Errors:</h3>
                <div className="max-h-60 overflow-auto space-y-1">
                  {result.errors.map((err, i) => (
                    <div key={i} className="text-sm text-red-400/80 bg-red-500/5 p-2 rounded">
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={() => navigate('/questions')}>Go to My Questions</Button>
              <Button variant="outline" onClick={() => { setResult(null); setFile(null); }}>
                Upload Another
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Button variant="outline" onClick={downloadTemplate}>
            Download CSV Template
          </Button>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            {file ? (
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setFile(null)}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground mb-2">
                  Drag and drop a CSV file here, or click to browse
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <Button variant="outline" asChild>
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    Browse Files
                  </label>
                </Button>
              </div>
            )}
          </div>

          {file && (
            <Button onClick={handleUpload} disabled={uploading} className="w-full">
              {uploading ? 'Uploading...' : 'Upload CSV'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
