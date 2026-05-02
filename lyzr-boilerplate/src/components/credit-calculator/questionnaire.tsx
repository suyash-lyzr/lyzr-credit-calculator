"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { IconSend, IconCheck } from "@tabler/icons-react";

interface Question {
  id: string;
  question: string;
  type: "radio" | "checkbox" | "number";
  options?: string[];
  placeholder?: string;
  unit?: string;
  helper?: string;
}

interface QuestionnaireData {
  type: "questionnaire";
  intro: string;
  questions: Question[];
}

interface QuestionnaireProps {
  data: QuestionnaireData;
  onSubmit: (responses: Record<string, string | string[]>, questions: { id: string; question: string }[]) => void;
  isLoading?: boolean;
  submittedResponses?: Record<string, string | string[]>;
}

export function Questionnaire({ data, onSubmit, isLoading, submittedResponses }: QuestionnaireProps) {
  const [responses, setResponses] = React.useState<Record<string, string | string[]>>(submittedResponses || {});
  const isSubmitted = !!submittedResponses;

  const handleRadioChange = (questionId: string, value: string) => {
    if (isSubmitted) return;
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    if (isSubmitted) return;
    setResponses((prev) => {
      const current = (prev[questionId] as string[]) || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, option] };
      } else {
        return { ...prev, [questionId]: current.filter((o) => o !== option) };
      }
    });
  };

  const handleNumberChange = (questionId: string, value: string) => {
    if (isSubmitted) return;
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    onSubmit(responses, data.questions.map(q => ({ id: q.id, question: q.question })));
  };

  const isComplete = data.questions.every((q) => {
    const answer = responses[q.id];
    if (q.type === "radio") {
      return !!answer;
    }
    if (q.type === "number") {
      return typeof answer === "string" && answer.trim() !== "" && !isNaN(Number(answer)) && Number(answer) >= 0;
    }
    return Array.isArray(answer) && answer.length > 0;
  });

  return (
    <div className="mt-3 space-y-3">
      <p className="text-sm text-muted-foreground">{data.intro}</p>
      
      {data.questions.map((question) => (
        <div key={question.id} className="space-y-1.5">
          <Label className="text-sm font-medium text-foreground">
            {question.question}
          </Label>
          
          {question.helper && (
            <p className="text-xs text-muted-foreground">{question.helper}</p>
          )}

          {question.type === "number" ? (
            isSubmitted ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 py-2 px-3">
                <IconCheck className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm">
                  {Number(responses[question.id] as string).toLocaleString()}
                  {question.unit ? ` ${question.unit}` : ""}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder={question.placeholder || "e.g. 10000"}
                  value={(responses[question.id] as string) || ""}
                  onChange={(e) => handleNumberChange(question.id, e.target.value)}
                  className="h-9"
                />
                {question.unit && (
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {question.unit}
                  </span>
                )}
              </div>
            )
          ) : question.type === "radio" ? (
            <RadioGroup
              value={responses[question.id] as string || ""}
              onValueChange={(value) => handleRadioChange(question.id, value)}
              className="grid grid-cols-2 gap-1.5"
              disabled={isSubmitted}
            >
              {(question.options ?? []).map((option) => {
                const isSelected = responses[question.id] === option;
                if (isSubmitted && !isSelected) return null;
                return (
                  <label
                    key={option}
                    htmlFor={`${question.id}-${option}`}
                    className={`flex items-center gap-2 rounded-lg border py-2 px-3 transition-all ${
                      isSubmitted 
                        ? "bg-primary/10 border-primary/30 cursor-default" 
                        : isSelected 
                          ? "bg-primary/5 border-primary/40 cursor-pointer" 
                          : "bg-background border-border hover:bg-muted/50 cursor-pointer"
                    }`}
                  >
                    {!isSubmitted && (
                      <RadioGroupItem 
                        value={option} 
                        id={`${question.id}-${option}`}
                        className="border-primary data-[state=checked]:border-primary data-[state=checked]:text-primary h-4 w-4"
                      />
                    )}
                    {isSubmitted && <IconCheck className="h-4 w-4 text-primary flex-shrink-0" />}
                    <span className="text-sm flex-1">
                      {option}
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {(question.options ?? []).map((option) => {
                const isChecked = ((responses[question.id] as string[]) || []).includes(option);
                if (isSubmitted && !isChecked) return null;
                return (
                  <label
                    key={option}
                    htmlFor={`${question.id}-${option}`}
                    className={`flex items-center gap-2 rounded-lg border py-2 px-3 transition-all ${
                      isSubmitted 
                        ? "bg-primary/10 border-primary/30 cursor-default" 
                        : isChecked 
                          ? "bg-primary/5 border-primary/40 cursor-pointer" 
                          : "bg-background border-border hover:bg-muted/50 cursor-pointer"
                    }`}
                  >
                    {!isSubmitted && (
                      <Checkbox
                        id={`${question.id}-${option}`}
                        checked={isChecked}
                        className="border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary h-4 w-4"
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(question.id, option, checked as boolean)
                        }
                      />
                    )}
                    {isSubmitted && <IconCheck className="h-4 w-4 text-primary flex-shrink-0" />}
                    <span className="text-sm flex-1">
                      {option}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {!isSubmitted && (
        <Button
          onClick={handleSubmit}
          disabled={!isComplete || isLoading}
          className="w-full mt-2"
        >
          <IconSend className="mr-2 h-4 w-4" />
          Calculate Credits & ROI
        </Button>
      )}
    </div>
  );
}

export function parseQuestionnaire(content: string): QuestionnaireData | null {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) return null;
  
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    if (parsed.type === "questionnaire" && Array.isArray(parsed.questions)) {
      return parsed as QuestionnaireData;
    }
  } catch {
    return null;
  }
  
  return null;
}
