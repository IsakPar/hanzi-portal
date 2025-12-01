/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ReadingComprehensionEditor - Edit reading comprehension questions
 */

import { useState } from 'react';
import { FormField } from '../shared/FormField';
import type { ReadingComprehensionBlock } from '@/types/lesson';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { InlineAudioStatus } from '@/components/audio/InlineAudioStatus';
import { AISuggestButton } from '@/components/ai/AISuggestButton';
import type { Suggestion } from '@/services/aiSuggestAPI';
import { cn } from '@/lib/utils';

interface ReadingComprehensionEditorProps {
  block: ReadingComprehensionBlock;
  onChange: (field: string, value: any) => void;
  lessonId?: string;
  hskLevel?: number;
}

export function ReadingComprehensionEditor({ block, onChange, lessonId = '', hskLevel = 1 }: ReadingComprehensionEditorProps) {
  const [questions, setQuestions] = useState(
    block.content.questions || [
      {
        question: '',
        choices: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ],
      },
    ]
  );

  const updateContent = (field: string, value: any) => {
    onChange('content', {
      ...block.content,
      [field]: value
    });
  };

  const updateQuestions = (newQuestions: any[]) => {
    setQuestions(newQuestions);
    updateContent('questions', newQuestions);
  };

  return (
    <div className="space-y-6">
      <FormField
        label="Instruction"
        required
        value={block.content.instruction || ''}
        onChange={(value) => updateContent('instruction', value)}
        placeholder="Answer the questions based on the text."
      />

      {/* Questions */}
      <div className="space-y-4">
        <Label>
          Questions <span className="text-destructive">*</span>
        </Label>

        <div className="space-y-4">
          {questions.map((question: any, qIndex: number) => (
            <div
              key={qIndex}
              className="p-6 border rounded-lg bg-card shadow-sm space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b">
                <span className="text-sm font-semibold">Question {qIndex + 1}</span>
                <button
                  onClick={() => updateQuestions(questions.filter((_, i) => i !== qIndex))}
                  className="text-xs text-destructive hover:bg-destructive/10 px-2 py-1 rounded transition-colors"
                >
                  Remove Question
                </button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Question Text</Label>
                <Textarea
                  value={question.question}
                  onChange={(e) => {
                    const newQuestions = [...questions];
                    newQuestions[qIndex].question = e.target.value;
                    updateQuestions(newQuestions);
                  }}
                  placeholder="Why is the speaker busy today?"
                  rows={2}
                />
              </div>

              {/* Choices */}
              <div className="space-y-3 pl-4 border-l-2 border-muted">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Answer Choices</Label>
                  {question.choices.some((c: any) => c.isCorrect && c.text) && (
                    <AISuggestButton
                      context="mcq-wrong-option"
                      correctAnswer={question.choices.find((c: any) => c.isCorrect)?.text || ''}
                      hskLevel={hskLevel}
                      exclude={question.choices.map((c: any) => c.text).filter(Boolean)}
                      count={3}
                      onSelect={(suggestion: Suggestion) => {
                        const newQuestions = [...questions];
                        newQuestions[qIndex].choices.push({ text: suggestion.text, isCorrect: false });
                        updateQuestions(newQuestions);
                      }}
                      size="sm"
                    />
                  )}
                </div>
                
                <div className="space-y-2">
                  {question.choices.map((choice: any, cIndex: number) => (
                    <div key={cIndex} className="flex gap-2 items-center group">
                      <div className="flex-1 relative">
                        <Input
                          value={choice.text}
                          onChange={(e) => {
                            const newQuestions = [...questions];
                            newQuestions[qIndex].choices[cIndex].text = e.target.value;
                            updateQuestions(newQuestions);
                          }}
                          placeholder={`Choice ${cIndex + 1}`}
                          className={cn(
                            choice.isCorrect && "border-green-500 ring-1 ring-green-500/20 bg-green-50/10"
                          )}
                        />
                      </div>
                      
                      <InlineAudioStatus
                        text={choice.text || ''}
                        audioUrl={choice.audioUrl}
                        lessonId={lessonId || 'draft'}
                        blockId={block.id}
                        optionId={`q${qIndex}-c${cIndex}`}
                        onAudioSaved={(url) => {
                          const newQuestions = [...questions];
                          newQuestions[qIndex].choices[cIndex].audioUrl = url;
                          updateQuestions(newQuestions);
                        }}
                        disabled={!lessonId}
                      />
                      
                      {/* AI Suggest for wrong options */}
                      {!choice.isCorrect && question.choices.some((c: any) => c.isCorrect && c.text) && (
                        <AISuggestButton
                          context="mcq-wrong-option"
                          correctAnswer={question.choices.find((c: any) => c.isCorrect)?.text || ''}
                          hskLevel={hskLevel}
                          exclude={question.choices.map((c: any) => c.text).filter(Boolean)}
                          count={5}
                          onSelect={(suggestion: Suggestion) => {
                            const newQuestions = [...questions];
                            newQuestions[qIndex].choices[cIndex].text = suggestion.text;
                            updateQuestions(newQuestions);
                          }}
                          size="sm"
                        />
                      )}
                      
                      <button
                        onClick={() => {
                          const newQuestions = [...questions];
                          newQuestions[qIndex].choices.forEach((c: any, i: number) => {
                            c.isCorrect = i === cIndex;
                          });
                          updateQuestions(newQuestions);
                        }}
                        className={cn(
                          "p-2 rounded-md transition-colors",
                          choice.isCorrect 
                            ? "bg-green-100 text-green-700 hover:bg-green-200" 
                            : "bg-muted text-muted-foreground hover:bg-muted/80 opacity-50 group-hover:opacity-100"
                        )}
                        title="Mark as correct"
                      >
                        <CheckCircle size={18} />
                      </button>
                      
                      <button
                        onClick={() => {
                          const newQuestions = [...questions];
                          newQuestions[qIndex].choices = newQuestions[qIndex].choices.filter(
                            (_: any, i: number) => i !== cIndex
                          );
                          updateQuestions(newQuestions);
                        }}
                        className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => {
                      const newQuestions = [...questions];
                      newQuestions[qIndex].choices.push({ text: '', isCorrect: false });
                      updateQuestions(newQuestions);
                    }}
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
                  >
                    <Plus size={12} />
                    Add Choice
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          <button
            onClick={() =>
              updateQuestions([
                ...questions,
                {
                  question: '',
                  choices: [
                    { text: '', isCorrect: false },
                    { text: '', isCorrect: false },
                  ],
                },
              ])
            }
            className="flex items-center justify-center gap-2 w-full p-4 border border-dashed rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Add Question
          </button>
        </div>
      </div>
    </div>
  );
}
