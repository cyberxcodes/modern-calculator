import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculate} from './math.js';
test('precedence, grouping and decimals',()=>{assert.equal(calculate('2+3×4'),14);assert.equal(calculate('(2+3)×4'),20);assert.equal(calculate('0.1+0.2'),0.3);});
test('unary signs and percentages',()=>{assert.equal(calculate('−(5+3)'),-8);assert.equal(calculate('200×10%'),20);assert.equal(calculate('2×−3'),-6);});
test('rejects incomplete, invalid and nonfinite expressions',()=>{for(const input of ['1÷0','2+','(3+2','alert(1)','2 3',''])assert.throws(()=>calculate(input));});
