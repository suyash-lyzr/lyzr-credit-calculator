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
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{data.intro}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {data.questions.map((question) => (
          <div key={question.id} className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              {question.question}
            </Label>
            
            {question.type === "radio" ? (
              <RadioGroup
                value={responses[question.id] as string || ""}
                onValueChange={(value) => handleRadioChange(question.id, value)}
                className="grid grid-cols-2 gap-2"
              >
                {question.options.map((option) => (
                  <div
                    key={option}
                    className="flex items-center space-x-2 rounded-lg border bg-background p-3 cursor-pointer hover:bg-accent transition-colors"
                  >
                    <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                    <Label
                      htmlFor={`${question.id}-${option}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {question.options.map((option) => {
                  const isChecked = ((responses[question.id] as string[]) || []).includes(option);
                  return (
                    <div
                      key={option}
                      className={`flex items-center space-x-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                        isChecked ? "bg-primary/10 border-primary" : "bg-background hover:bg-accent"
                      }`}
                      onClick={() => handleCheckboxChange(question.id, option, !isChecked)}
                    >
                      <Checkbox
                        id={`${question.id}-${option}`}
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(question.id, option, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`${question.id}-${option}`}
                        className="text-sm cursor-pointer flex-1"
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
          className="w-full mt-4"
          size="lg"
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
