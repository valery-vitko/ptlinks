import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// setup.js handles chrome mock and globalThis.DEFAULT_JIRA_TENANT_NAME
const content = require('../src/content.js');

const TENANT = 'testcorp';

function makeElement(text) {
  const el = document.createElement('span');
  el.textContent = text;
  // jsdom requires elements to be in the document for innerText to work
  document.body.appendChild(el);
  return el;
}

function linksIn(el) {
  return [...el.querySelectorAll('a')];
}

describe('buildLink', () => {
  beforeEach(() => {
    content.JIRA_TENANT_NAME = TENANT;
  });

  afterEach(() => {
    // Clean up DOM between tests
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  // --- Jira single ID ---
  it('converts a single Jira ID to a link', () => {
    const el = makeElement('ENG-145 Fix login bug');
    content.buildLink(el);

    const links = linksIn(el);
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe(`https://${TENANT}.atlassian.net/browse/ENG-145`);
    expect(links[0].textContent).toBe('ENG-145');
    expect(links[0].target).toBe('_blank');
  });

  // --- Jira multiple IDs (the bug) ---
  it('converts multiple Jira IDs in the same element to links', () => {
    const el = makeElement('ENG-145 ENG-146 ENG-148 Multiple Jira IDs');
    content.buildLink(el);

    const links = linksIn(el);
    expect(links).toHaveLength(3);
    expect(links[0].href).toContain('/browse/ENG-145');
    expect(links[1].href).toContain('/browse/ENG-146');
    expect(links[2].href).toContain('/browse/ENG-148');
  });

  it('converts two Jira IDs from different projects', () => {
    const el = makeElement('ENG-1 DATA-99 cross-team commit');
    content.buildLink(el);

    const links = linksIn(el);
    expect(links).toHaveLength(2);
    expect(links[0].href).toContain('/browse/ENG-1');
    expect(links[1].href).toContain('/browse/DATA-99');
  });

  // --- Jira edge cases ---
  it('handles Jira IDs with long project keys (up to 6 chars)', () => {
    const el = makeElement('ABCDEF-123 long key');
    content.buildLink(el);

    const links = linksIn(el);
    expect(links).toHaveLength(1);
    expect(links[0].href).toContain('/browse/ABCDEF-123');
  });

  it('does not match lowercase prefixes', () => {
    const el = makeElement('eng-145 lowercase');
    content.buildLink(el);
    expect(linksIn(el)).toHaveLength(0);
  });

  it('does not match project keys longer than 6 chars', () => {
    const el = makeElement('ABCDEFG-1 too long');
    content.buildLink(el);
    expect(linksIn(el)).toHaveLength(0);
  });

  it('does not match issue numbers longer than 5 digits', () => {
    const el = makeElement('ENG-123456 too many digits');
    content.buildLink(el);
    expect(linksIn(el)).toHaveLength(0);
  });

  // --- Pivotal Tracker ---
  it('converts a Pivotal Tracker story number to a link', () => {
    const el = makeElement('#12345678 tracker story');
    content.buildLink(el);

    const links = linksIn(el);
    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('https://www.pivotaltracker.com/story/show/12345678');
    expect(links[0].textContent).toBe('#12345678');
  });

  it('converts a Pivotal Tracker 9-digit story number', () => {
    const el = makeElement('123456789 nine digits');
    content.buildLink(el);

    const links = linksIn(el);
    expect(links).toHaveLength(1);
    expect(links[0].href).toContain('/story/show/123456789');
  });

  // --- Priority: Jira wins over PT ---
  it('prefers Jira ID when both Jira and PT patterns could match', () => {
    const el = makeElement('ENG-145 12345678');
    content.buildLink(el);

    const links = linksIn(el);
    // Jira match should be present; PT may or may not depending on implementation
    expect(links.some(l => l.href.includes('atlassian.net'))).toBe(true);
  });

  // --- No match ---
  it('leaves text unchanged when there is no match', () => {
    const el = makeElement('Just a regular commit message');
    const original = el.innerHTML;
    content.buildLink(el);
    expect(el.innerHTML).toBe(original);
  });

  it('leaves text unchanged for short numbers', () => {
    const el = makeElement('Fix issue 42');
    const original = el.innerHTML;
    content.buildLink(el);
    expect(el.innerHTML).toBe(original);
  });

  // --- onclick stopPropagation ---
  it('adds onclick="event.stopPropagation()" to Jira links', () => {
    const el = makeElement('ENG-1 test');
    content.buildLink(el);
    expect(el.innerHTML).toContain('event.stopPropagation()');
  });
});
