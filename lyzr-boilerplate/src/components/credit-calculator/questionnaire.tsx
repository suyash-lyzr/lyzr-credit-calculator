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
  onSubmit: (responses: Record<string, string | string[]>) => void;
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
    const formattedResponses: string[] = [];
    data.questions.forEach((q) => {
      const answer = responses[q.id];
      if (answer) {
        if (Array.isArray(answer)) {
          formattedResponses.push(`${q.question}: ${answer.join(", ")}`);
        } else {
          formattedResponses.push(`${q.question}: ${answer}`);
        }
      }
    });
    onSubmit(responses);
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
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm font-medium">{data.intro}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3">
        {data.questions.map((question) => (
          <div key={question.id} className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">
              {question.question}
            </Label>
            
            {question.type === "radio" ? (
              <RadioGroup
                value={responses[question.id] as string || ""}
                onValueChange={(value) => handleRadioChange(question.id, value)}
                className="grid grid-cols-2 gap-1.5"
              >
                {question.options.map((option) => {
                  const isSelected = responses[question.id] === option;
                  return (
                    <div
                      key={option}
                      onClick={() => handleRadioChange(question.id, option)}
                      className={`flex items-center gap-2 rounded-lg border-2 p-2.5 cursor-pointer transition-all ${
                        isSelected 
                          ? "bg-primary/10 border-primary" 
                          : "bg-background border-primary/30 hover:border-primary/50 hover:bg-accent"
                      }`}
                    >
                      <RadioGroupItem 
                        value={option} 
                        id={`${question.id}-${option}`}
                        className="border-primary/50 data-[state=checked]:border-primary"
                      />
                      <Label
                        htmlFor={`${question.id}-${option}`}
                        className="text-sm cursor-pointer flex-1 leading-tight"
                      >
                        {option}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {question.options.map((option) => {
                  const isChecked = ((responses[question.id] as string[]) || []).includes(option);
                  return (
                    <div
                      key={option}
                      onClick={() => handleCheckboxChange(question.id, option, !isChecked)}
                      className={`flex items-center gap-2 rounded-lg border-2 p-2.5 cursor-pointer transition-all ${
                        isChecked 
                          ? "bg-primary/10 border-primary" 
                          : "bg-background border-primary/30 hover:border-primary/50 hover:bg-accent"
                      }`}
                    >
                      <Checkbox
                        id={`${question.id}-${option}`}
                        checked={isChecked}
                        className="border-primary/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(question.id, option, checked as boolean)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Label
                        htmlFor={`${question.id}-${option}`}
                        className="text-sm cursor-pointer flex-1 leading-tight"
                      >
                        {option}
                      </Label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        <Button
          onClick={handleSubmit}
          disabled={!isComplete || isLoading}
          className="w-full mt-2"
          size="default"
        >
          <IconSend className="mr-2 h-4 w-4" />
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
