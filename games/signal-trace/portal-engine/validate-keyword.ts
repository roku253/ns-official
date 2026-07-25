import { normalizeKeywordAnswer } from "./normalize-keyword"

export function keywordMatchesAnswers(acceptedAnswers: string[], userInput: string): boolean {
  if (!acceptedAnswers.length) return false
  const n = normalizeKeywordAnswer(userInput)
  if (!n) return false
  return acceptedAnswers.some((a) => normalizeKeywordAnswer(a) === n)
}
