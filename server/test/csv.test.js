import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCsv, questionsFromCsv } from '../src/services/csv.js';

test('parseCsv handles quotes, escaped quotes, commas and newlines inside fields, CRLF and BOM', () => {
  const rows = parseCsv('﻿a,b\r\n"x, y","he said ""hi"""\r\n"multi\nline",z\r\n');
  assert.deepEqual(rows, [['a', 'b'], ['x, y', 'he said "hi"'], ['multi\nline', 'z']]);
});

test('questionsFromCsv maps MCQ and descriptive rows', () => {
  const csv = [
    'subject,type,text,option1,option2,option3,option4,correct,explanation,difficulty,topic,frequency,rankSource,answer',
    'dsa,mcq,"Which is LIFO?",Queue,Stack,Heap,Tree,B,Stack is LIFO,easy,Stack,90,expert,',
    'os,descriptive,Explain deadlock,,,,,,,medium,Deadlock,95,placement_records,"Four conditions, prevention"',
  ].join('\n');
  const [a, b] = questionsFromCsv(csv);
  assert.deepEqual(a, { subject: 'dsa', type: 'mcq', text: 'Which is LIFO?', options: ['Queue', 'Stack', 'Heap', 'Tree'], correctIndex: 1, explanation: 'Stack is LIFO', difficulty: 'easy', topic: 'Stack', rankSource: 'expert', frequency: 90 });
  assert.equal(b.type, 'descriptive');
  assert.equal(b.answer, 'Four conditions, prevention');
  assert.equal(b.rankSource, 'placement_records');
});

test('numeric correct column is 1-based', () => {
  const [q] = questionsFromCsv('subject,text,option1,option2,correct\ndsa,Pick the second,a,b,2');
  assert.equal(q.correctIndex, 1);
});
