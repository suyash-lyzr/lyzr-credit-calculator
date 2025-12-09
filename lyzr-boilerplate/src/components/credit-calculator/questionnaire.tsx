"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { IconSend } from "@tabler/icons-react";

interface Question {
  id: string;
  question: string;
  type: "radio" | "checkbox";
  options: string[];
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
}

export function Questionnaire({ data, onSubmit, isLoading }: QuestionnaireProps) {
  const [responses, setResponses] = React.useState<Record<string, string | string[]>>({});

  const handleRadioChange = (questionId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    setResponses((prev) => {
      const current = (prev[questionId] as string[]) || [];
      if (checked) {
        return { ...prev, [questionId]: [...current, option] };
      } else {
        return { ...prev, [questionId]: current.filter((o) => o !== option) };
      }
    });
  };

  const handleSubmit = () => {
    onSubmit(responses, data.questions.map(q => ({ id: q.id, question: q.question })));
  };

  const isComplete = data.questions.every((q) => {
    const answer = responses[q.id];
    if (q.type === "radio") {
      return !!answer;
    }
    return Array.isArray(answer) && answer.length > 0;
  });

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="py-1.5 px-2.5">
        <CardTitle className="text-xs font-medium">{data.intro}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-2.5 pb-2.5">
        {data.questions.map((question) => (
          <div key={question.id} className="space-y-1">
            <Label className="text-xs font-medium text-foreground">
              {question.question}
            </Label>
            
            {question.type === "radio" ? (
              <RadioGroup
                value={responses[question.id] as string || ""}
                onValueChange={(value) => handleRadioChange(question.id, value)}
                className="grid grid-cols-2 gap-1"
              >
                {question.options.map((option) => {
                  const isSelected = responses[question.id] === option;
                  return (
                    <label
                      key={option}
                      htmlFor={`${question.id}-${option}`}
                      className={`flex items-center gap-1.5 rounded-md border py-1.5 px-2 cursor-pointer transition-all ${
                        isSelected 
                          ? "bg-primary/5 border-muted-foreground/30" 
                          : "bg-background border-border hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem 
                        value={option} 
                        id={`${question.id}-${option}`}
                        className="border-primary data-[state=checked]:border-primary data-[state=checked]:text-primary h-3.5 w-3.5"
                      />
                      <span className="text-xs flex-1 leading-tight">
                        {option}
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {question.options.map((option) => {
                  const isChecked = ((responses[question.id] as string[]) || []).includes(option);
                  return (
                    <label
                      key={option}
                      htmlFor={`${question.id}-${option}`}
                      className={`flex items-center gap-1.5 rounded-md border py-1.5 px-2 cursor-pointer transition-all ${
                        isChecked 
                          ? "bg-primary/5 border-muted-foreground/30" 
                          : "bg-background border-border hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        id={`${question.id}-${option}`}
                        checked={isChecked}
                        className="border-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary h-3.5 w-3.5"
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(question.id, option, checked as boolean)
                        }
                      />
                      <span className="text-xs flex-1 leading-tight">
                        {option}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        <Button
          onClick={handleSubmit}
          disabled={!isComplete || isLoading}
          className="w-full mt-1.5"
          size="sm"
        >
          <IconSend className="mr-1.5 h-3.5 w-3.5" />
          Calculate Credits & ROI
        </Button>
      </CardContent>
    </Card>
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
