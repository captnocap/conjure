import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_BRIEF_CHARACTERS, MAX_IDEA_CHARACTERS, MAX_QUESTIONS_PER_REQUEST } from '../engine/decision-limits';
import { decideSchema } from '../server/decision-schema';

const request = () => ({ idea: 'A scene idea', brief: 'Judge the typed questions by the idea.', questions: [{ type: 'noul', ask: 'Does this belong?' }] });

test('the live decision schema accepts 1200 brief characters and rejects 1201 with a brief error', () => {
  const body = request();
  assert.equal(MAX_BRIEF_CHARACTERS, 1200);
  assert.ok(decideSchema.safeParse({ ...body, brief: 'b'.repeat(1200) }).success);
  const tooLong = decideSchema.safeParse({ ...body, brief: 'b'.repeat(1201) });
  assert.equal(tooLong.success, false);
  if (!tooLong.success) {
    assert.deepEqual(tooLong.error.issues[0].path, ['brief']);
    assert.equal(tooLong.error.issues[0].code, 'too_big');
    assert.match(tooLong.error.issues[0].message, /1200/);
  }
});

test('the live decision schema accepts 400 questions and rejects 401', () => {
  const body = request();
  assert.equal(MAX_QUESTIONS_PER_REQUEST, 400);
  assert.ok(decideSchema.safeParse({ ...body, questions: Array.from({ length: 400 }, () => body.questions[0]) }).success);
  const tooMany = decideSchema.safeParse({ ...body, questions: Array.from({ length: 401 }, () => body.questions[0]) });
  assert.equal(tooMany.success, false);
  if (!tooMany.success) {
    assert.deepEqual(tooMany.error.issues[0].path, ['questions']);
    assert.equal(tooMany.error.issues[0].code, 'too_big');
  }
  assert.ok(!decideSchema.safeParse({ ...body, questions: [] }).success);
});

test('idea length, trimming and strict request fields retain the existing validation behavior', () => {
  const body = request();
  assert.equal(MAX_IDEA_CHARACTERS, 600);
  assert.ok(decideSchema.safeParse({ ...body, idea: 'a'.repeat(600) }).success);
  assert.ok(!decideSchema.safeParse({ ...body, idea: 'a'.repeat(601) }).success);
  assert.ok(!decideSchema.safeParse({ ...body, idea: '   ' }).success);
  assert.ok(!decideSchema.safeParse({ ...body, brief: '   ' }).success);
  const trimmed = decideSchema.parse({ ...body, idea: '  a scene  ', brief: '  a brief  ' });
  assert.equal(trimmed.idea, 'a scene');
  assert.equal(trimmed.brief, 'a brief');
  assert.ok(!decideSchema.safeParse({ ...body, unexpected: true }).success);
});

test('choice, score and noul questions preserve their distinct shapes and field caps', () => {
  const body = request();
  const valid = [
    { type: 'choice', ask: 'a'.repeat(600), options: { ['k'.repeat(120)]: 'v'.repeat(600) } },
    { type: 'score', ask: 's'.repeat(600), levels: Array.from({ length: 12 }, () => 'l'.repeat(300)) },
    { type: 'noul', ask: 'n'.repeat(900) },
  ];
  assert.ok(decideSchema.safeParse({ ...body, questions: valid }).success);
  for (const question of [
    { ...valid[0], ask: 'a'.repeat(601) },
    { type: 'choice', ask: 'Choose', options: { ['k'.repeat(121)]: 'value' } },
    { type: 'choice', ask: 'Choose', options: { key: 'v'.repeat(601) } },
    { type: 'score', ask: 'How much?', levels: ['One'] },
    { type: 'score', ask: 'How much?', levels: Array.from({ length: 13 }, () => 'level') },
    { type: 'score', ask: 'How much?', levels: ['Low', 'l'.repeat(301)] },
    { type: 'noul', ask: 'n'.repeat(901) },
    { type: 'noul', ask: 'Question?', extra: true },
  ]) assert.ok(!decideSchema.safeParse({ ...body, questions: [question] }).success, JSON.stringify(question).slice(0, 100));
});
