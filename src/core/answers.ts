// Fixed answer bank. Answers are never generated: a question either matches
// one of these vetted pairs or gets the fallback line.

export type Answer = { id: string; question: string; answer: string; match: RegExp };

export const FALLBACK_ANSWER = "I don't have guidance on that. Follow your training and wait for EMS.";

export const ANSWERS: Answer[] = [
  {
    id: 'loosen',
    question: 'Can I loosen the tourniquet?',
    answer: 'No. Leave it on and tighten it if bleeding returns. EMS will manage it.',
    match: /\b(loosen|loose|remove|take (it|the tourniquet) off|take off)\b/,
  },
  {
    id: 'where',
    question: 'Where does the tourniquet go?',
    answer: '2 to 3 inches above the wound. Not on a joint.',
    match: /\b(where|how high|above|joint|put (it|the tourniquet))\b/,
  },
  {
    id: 'tight',
    question: 'How tight should it be?',
    answer: 'Tighten it until the bleeding stops.',
    match: /\b(how tight|tight enough|tighter|tighten)\b/,
  },
  {
    id: 'no-tq',
    question: "I don't have a tourniquet.",
    answer: 'Keep firm, direct pressure on the wound. Pack it if you are trained.',
    match: /\b(no tourniquet|don'?t have a tourniquet|without a tourniquet|haven'?t got a tourniquet)\b/,
  },
  {
    id: 'stop-pressing',
    question: 'Can I stop pressing?',
    answer: 'No. Keep firm, direct pressure until help arrives or a tourniquet is on.',
    match: /\b(stop (pressing|pressure|pushing)|let go|ease off)\b/,
  },
  {
    id: 'time',
    question: 'Do I need to write down the time?',
    answer: 'Note the time the tourniquet went on. Pinpoint records it when you tap Done.',
    match: /\b(time|when (did|was) (it|the tourniquet))\b/,
  },
];

export function getAnswer(id: string): Answer | undefined {
  return ANSWERS.find((a) => a.id === id);
}

/** Match a spoken question to the bank. Order matters: more specific first. */
export function matchQuestion(text: string): Answer | undefined {
  const t = text.toLowerCase();
  const order = ['no-tq', 'loosen', 'stop-pressing', 'tight', 'where', 'time'];
  for (const id of order) {
    const a = getAnswer(id)!;
    if (a.match.test(t)) return a;
  }
  return undefined;
}

export function answerFor(text: string): { answer: string; matched?: Answer } {
  const matched = matchQuestion(text);
  return matched ? { answer: matched.answer, matched } : { answer: FALLBACK_ANSWER };
}
