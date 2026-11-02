// Export the actual auto-discovered catalogue and its decision questions for other models.
// npm run export -- <destination> [--all]  (--all also writes 143,360 JSONL scene briefs)
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const target = resolve(args.find((arg) => !arg.startsWith('--')) ?? '.data/export');
mkdirSync(target, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  await page.route('**/@vite/client', (route) => route.fulfill({ contentType: 'text/javascript', body: 'export function createHotContext(){return {accept(){},dispose(){},on(){},data:{}}} export function injectQuery(url){return url}' }));
  await page.goto(`${process.env.CONJURE_URL ?? 'http://127.0.0.1:3400'}/dev/check.html`);
  await page.waitForLoadState('load');
  const inventory = await page.evaluate(async () => {
    const { CATALOGUE, loadBuilder } = await import('/engine/catalogue.ts');
    const { DESIGN_QUESTIONS } = await import('/engine/design.ts');
    const { STYLE_MEDIA, styleQuestions } = await import('/engine/styles.ts');
    const { FRAMING_QUESTIONS } = await import('/engine/framing.ts');
    const { PRESENTATION_QUESTIONS, PRESENTATIONS, ARCS } = await import('/engine/presentation.ts');
    const { SVG_MOTIFS } = await import('/kit/svg.ts');
    const { IDEA_DOMAINS, ATMOSPHERES, DIRECTIONS, SCENE_IDEAS, IDEA_COMBINATIONS } = await import('/src/ideas.ts');
    const { houseQuestion } = await import('/engine/art-direction.ts');
    const entries = [];
    for (const entry of CATALOGUE) {
      const builder = await loadBuilder(entry);
      // A direction asks nothing; it exports its brief, note and finishes instead.
      entries.push(entry.kind === 'direction' ? { ...entry, questions: {}, direction: builder } : { ...entry, questions: builder.questions });
    }
    return {
      format: 'conjure-decision-inventory-v1',
      scales: ['cosmic', 'planetary', 'landscape', 'street', 'room', 'tabletop', 'macro'],
      components: entries,
      house: { owner: 'direction', questions: houseQuestion(CATALOGUE.filter((entry) => entry.kind === 'direction')) },
      design: { owner: 'design', questions: DESIGN_QUESTIONS, motifs: SVG_MOTIFS },
      style: { owner: 'direction', questions: styleQuestions(CATALOGUE.filter((entry) => entry.kind === 'look')), media: STYLE_MEDIA },
      framing: { owner: 'direction', questions: FRAMING_QUESTIONS },
      presentation: { owner: 'direction', questions: PRESENTATION_QUESTIONS, presentations: PRESENTATIONS, arcs: ARCS },
      sceneGrammar: { domains: IDEA_DOMAINS, atmospheres: ATMOSPHERES, directions: DIRECTIONS, combinations: IDEA_COMBINATIONS },
      sceneSeeds: SCENE_IDEAS,
    };
  });
  writeFileSync(resolve(target, 'conjure-inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
  writeFileSync(resolve(target, 'scene-seeds.jsonl'), inventory.sceneSeeds.map((idea) => JSON.stringify(idea)).join('\n') + '\n');
  if (args.includes('--all')) {
    const lines = [];
    const grammar = inventory.sceneGrammar;
    for (const domain of grammar.domains)
      for (const [p, title] of domain.premises.entries())
        for (const [d, detail] of domain.details.entries())
          for (const [a, atmosphere] of grammar.atmospheres.entries())
            for (const [f, direction] of grammar.directions.entries())
              lines.push(JSON.stringify({
                id: `${domain.scale}-${p + 1}-${d + 1}-${a + 1}-${f + 1}`, scale: domain.scale, title,
                prompt: `${title}. ${detail}. ${atmosphere}. ${direction}.`,
              }));
    writeFileSync(resolve(target, 'scene-briefs.jsonl'), lines.join('\n') + '\n');
  }
  const designQuestions = [...Object.values(inventory.house.questions), ...Object.values(inventory.design.questions), ...Object.values(inventory.style.questions), ...Object.values(inventory.framing.questions), ...Object.values(inventory.presentation.questions)];
  const questions = inventory.components.reduce((sum, entry) => sum + Object.keys(entry.questions).length, designQuestions.length);
  const choices = [...inventory.components.flatMap((entry) => Object.values(entry.questions)), ...designQuestions].filter((question) => question.type === 'choice');
  console.log(JSON.stringify({ target, components: inventory.components.length, questions,
    choiceOptions: choices.reduce((sum, question) => sum + Object.keys(question.options).length, 0),
    sceneSeeds: inventory.sceneSeeds.length, sceneCombinations: inventory.sceneGrammar.combinations }));
} finally {
  await browser.close();
}
