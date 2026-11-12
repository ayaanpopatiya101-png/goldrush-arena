import { SaveWorkshopPresetBody, AssistWorkshopBody } from "@workspace/api-zod";
// Orval's generated bounds are the contract; add strict nested keys, integers,
// and cross-field constraints which OpenAPI/codegen cannot express completely.
const shape = SaveWorkshopPresetBody.shape;
export const workshopPresetSchema = SaveWorkshopPresetBody.extend({
  name: shape.name.trim().min(1),
  court: shape.court.strict(),
  hit: shape.hit.extend({ size: shape.hit.shape.size.int(), duration: shape.hit.shape.duration.int() }).strict(),
  rules: shape.rules.extend({
    lives: shape.rules.shape.lives.int(), balls: shape.rules.shape.balls.int(), maxBalls: shape.rules.shape.maxBalls.int(),
  }).strict().refine(r => r.balls <= r.maxBalls, "Starting balls cannot exceed maximum balls."),
}).strict();
export const workshopAssistSchema = AssistWorkshopBody.extend({
  current: workshopPresetSchema,
  history: AssistWorkshopBody.shape.history.element.strict().array().max(6),
}).strict();
/** Exclude phone-like strings, emails and data URLs before third-party processing. */
export function promptSafe(text: string) {
  return !/(?:\+?\d[\s().-]*){7,}|[\w.+-]+@[\w.-]+\.[a-z]{2,}|data:|https?:\/\//i.test(text);
}
export function validateProposal(value: unknown, id: string) {
  if (!value || typeof value !== "object" || Object.keys(value).some(k => !['proposal','explanation','question'].includes(k))) throw new Error("Invalid proposal");
  const v = value as Record<string, unknown>;
  if (typeof v.explanation !== "string" || v.explanation.length > 600 || typeof v.question !== "string" || v.question.length > 200) throw new Error("Invalid explanation");
  const proposal = workshopPresetSchema.parse(v.proposal);
  if (proposal.id !== id) throw new Error("Design identity changed");
  return { proposal, explanation: v.explanation, question: v.question };
}
