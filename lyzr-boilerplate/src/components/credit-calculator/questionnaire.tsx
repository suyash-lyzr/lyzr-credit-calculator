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

  // On-prem / VPC deployments are always bring-your-own-model — Lyzr doesn't host models there.
  // Detect the deployment + model questions by their option text (the LLM generates these, so we
  // can't rely on a fixed id/order), then hide the "Lyzr-hosted" option whenever on-prem is chosen.
  const deploymentQuestion = data.questions.find(
    (q) => q.type === "radio" && (q.options ?? []).some((o) => /on-?prem|\bVPC\b/i.test(o))
  );
  const deploymentValue = deploymentQuestion ? (responses[deploymentQuestion.id] as string | undefined) : undefined;
  const isOnPrem = !!deploymentValue && /on-?prem|\bVPC\b/i.test(deploymentValue);

  const modelQuestion = data.questions.find(
    (q) => q.type === "radio" && (q.options ?? []).some((o) => /bring your own/i.test(o))
  );
  const byoOption = modelQuestion?.options?.find((o) => /bring your own/i.test(o));

  const isHiddenOption = (questionId: string, option: string) =>
    isOnPrem && questionId === modelQuestion?.id && /lyzr-?hosted/i.test(option);

  // When the user switches to on-prem, force the model answer to BYO (the only remaining option) so
  // a previously-selected "Lyzr-hosted" choice doesn't silently persist while hidden.
  React.useEffect(() => {
    if (isSubmitted || !isOnPrem || !modelQuestion || !byoOption) return;
    const current = responses[modelQuestion.id] as string | undefined;
    if (current !== byoOption) {
      setResponses((prev) => ({ ...prev, [modelQuestion.id]: byoOption }));
    }
  }, [isOnPrem, isSubmitted, modelQuestion, byoOption, responses]);

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
                if (isHiddenOption(question.id, option)) return null;
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

function asQuestionnaire(raw: string): QuestionnaireData | null {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.type === "questionnaire" && Array.isArray(parsed.questions)) {
      return parsed as QuestionnaireData;
    }
  } catch {
    /* not valid JSON — fall through */
  }
  return null;
}

/** Extract every top-level {...} object from text, brace-balanced and string-aware. */
function extractJsonObjects(text: string): string[] {
  const objs: string[] = [];
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        objs.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return objs;
}

/**
 * Parse the questionnaire JSON whether or not the model wrapped it in a ```json fence. Anthropic
 * fenced it; some OpenAI models emit the bare object. We try the fenced block first, then scan the
 * whole message for any balanced {...} that is a questionnaire — so it renders correctly either way.
 */
export function parseQuestionnaire(content: string): QuestionnaireData | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) {
    const r = asQuestionnaire(fenced[1].trim());
    if (r) return r;
  }
  for (const obj of extractJsonObjects(content)) {
    const r = asQuestionnaire(obj);
    if (r) return r;
  }
  return null;
}

/** Remove the questionnaire JSON (fenced or bare) from a message, leaving any surrounding prose. */
export function stripQuestionnaireJson(content: string): string {
  // Drop fenced code blocks whose contents are a questionnaire.
  let out = content.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, (m, inner) =>
    asQuestionnaire(String(inner).trim()) ? "" : m
  );
  // Drop bare (unfenced) questionnaire objects.
  for (const obj of extractJsonObjects(out)) {
    if (asQuestionnaire(obj)) out = out.split(obj).join("");
  }
  return out.trim();
}
