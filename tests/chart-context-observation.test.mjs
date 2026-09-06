import { describe,expect,it } from 'vitest';
import { contextConsoleFailure,inspectContextInk } from './chart-context-checks.mjs';
describe('chart context observation rejects hidden failures',()=>{
  it('flags out-of-bounds and overlapping actual glyph ink',()=>{
    expect(inspectContextInk([{text:'a',left:20,right:90,top:40,bottom:60}]).clipped).toHaveLength(1);
    expect(inspectContextInk([{text:'a',left:40,right:90,top:40,bottom:60},{text:'b',left:50,right:100,top:45,bottom:65}]).overlaps).toHaveLength(1);
  });
  it('only recognizes the exact injected resource-error shape',()=>{
    const expected=new Set(['https://fixture/chunk.js']);
    expect(contextConsoleFailure({text:'Failed to load resource: net::ERR_FAILED',argumentCount:0,url:'https://fixture/chunk.js'},expected)).toBe(false);
    expect(contextConsoleFailure({text:'Real failure',argumentCount:0,url:'https://fixture/chunk.js'},expected)).toBe(true);
    expect(contextConsoleFailure({text:'Failed to load resource: net::ERR_FAILED',argumentCount:0,url:'https://fixture/other.js'},expected)).toBe(true);
  });
});
