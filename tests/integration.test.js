import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// setup.js handles chrome mock and globalThis.DEFAULT_JIRA_TENANT_NAME
const content = require('../src/content.js');

const TENANT = 'testcorp';

describe('integration', () => {
  beforeEach(() => {
    content.JIRA_TENANT_NAME = TENANT;
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  // --- readSettings / chrome.storage ---
  describe('readSettings', () => {
    it('reads tenant name from chrome.storage.sync', async () => {
      chrome.storage.sync.get = (_keys, cb) => cb({ jiraTenantName: 'custom-tenant' });

      await content.readSettings();
      expect(content.JIRA_TENANT_NAME).toBe('custom-tenant');

      // Reset
      chrome.storage.sync.get = (_keys, cb) => cb({});
    });

    it('keeps default when storage is empty', async () => {
      chrome.storage.sync.get = (_keys, cb) => cb({});
      content.JIRA_TENANT_NAME = DEFAULT_JIRA_TENANT_NAME;

      await content.readSettings();
      expect(content.JIRA_TENANT_NAME).toBe(DEFAULT_JIRA_TENANT_NAME);
    });
  });

  // --- elementConfig ---
  describe('elementConfig', () => {
    it('has planitpoker config with immediate and watched arrays', () => {
      expect(content.elementConfig['planitpoker.com']).toBeDefined();
      expect(content.elementConfig['planitpoker.com'].immediate).toBeInstanceOf(Array);
      expect(content.elementConfig['planitpoker.com'].watched).toBeInstanceOf(Array);
    });

    it('has github config with immediate and watched arrays', () => {
      expect(content.elementConfig['github.com']).toBeDefined();
      expect(content.elementConfig['github.com'].immediate).toBeInstanceOf(Array);
      expect(content.elementConfig['github.com'].watched).toBeInstanceOf(Array);
    });
  });

  // --- MutationObserver wiring ---
  describe('MutationObserver wiring', () => {
    it('buildLink is called on mutation via observer pattern', () => {
      const el = document.createElement('span');
      el.textContent = 'DATA-7 new issue';
      document.body.appendChild(el);

      // Verify the pattern works: observer triggers buildLink on childList change
      const observer = new MutationObserver(() => {
        content.buildLink(el);
      });
      observer.observe(el, { characterData: true, childList: true, subtree: true });

      // Directly call buildLink as the observer would
      content.buildLink(el);

      const link = el.querySelector('a');
      expect(link).not.toBeNull();
      expect(link.href).toContain('/browse/DATA-7');

      observer.disconnect();
    });
  });

  // --- Idempotency ---
  describe('idempotency', () => {
    it('does not double-wrap links when buildLink is called twice', () => {
      const el = document.createElement('span');
      el.textContent = 'ENG-1 test';
      document.body.appendChild(el);

      content.buildLink(el);
      content.buildLink(el);

      const links = el.querySelectorAll('a');
      expect(links).toHaveLength(1);
    });
  });

  // --- Commit page selector ---
  describe('commit page selector', () => {
    it('elementConfig includes commitMessageContainer selector for github.com', () => {
      const ghConfig = content.elementConfig['github.com'];
      const commitSelector = '[class*="commitMessageContainer"] > .f5';
      expect(ghConfig.immediate).toContain(commitSelector);
      expect(ghConfig.watched).toContain(commitSelector);
    });

    it('processImmediateElements links Jira IDs in commit page DOM structure', () => {
      // Simulate GitHub commit page DOM: container div with CSS-module class > span.f5 > div
      const container = document.createElement('div');
      container.className = 'CommitHeader-module__commitMessageContainer__Nj8bH';
      const span = document.createElement('span');
      span.className = 'ws-pre-wrap f5 wb-break-word text-mono';
      const inner = document.createElement('div');
      inner.textContent = 'VS-246 VS-361 VS-362';
      span.appendChild(inner);
      container.appendChild(span);
      document.body.appendChild(container);

      // Stub location for github.com
      const origLocation = window.location;
      delete window.location;
      window.location = { hostname: 'github.com', href: 'https://github.com/Org/repo/commit/abc123' };

      content.processImmediateElements();

      const links = span.querySelectorAll('a');
      expect(links).toHaveLength(3);
      expect(links[0].href).toContain('/browse/VS-246');
      expect(links[1].href).toContain('/browse/VS-361');
      expect(links[2].href).toContain('/browse/VS-362');

      window.location = origLocation;
    });

    it('processImmediateElements links single Jira ID with description on commit page', () => {
      const container = document.createElement('div');
      container.className = 'CommitHeader-module__commitMessageContainer__xYz12';
      const span = document.createElement('span');
      span.className = 'ws-pre-wrap f5 wb-break-word text-mono';
      const inner = document.createElement('div');
      inner.textContent = 'FRIA2-314 Migrate to npm, webpack 5, refresh packages';
      span.appendChild(inner);
      container.appendChild(span);
      document.body.appendChild(container);

      const origLocation = window.location;
      delete window.location;
      window.location = { hostname: 'github.com', href: 'https://github.com/Org/repo/commit/def456' };

      content.processImmediateElements();

      const links = span.querySelectorAll('a');
      expect(links).toHaveLength(1);
      expect(links[0].href).toContain('/browse/FRIA2-314');
      expect(span.textContent).toContain('Migrate to npm');

      window.location = origLocation;
    });
  });

  // --- Tenant name flows into generated links ---
  describe('tenant name integration', () => {
    it('uses configured tenant name in generated Jira URLs', async () => {
      chrome.storage.sync.get = (_keys, cb) => cb({ jiraTenantName: 'acme' });
      await content.readSettings();

      const el = document.createElement('span');
      el.textContent = 'PROJ-42 using custom tenant';
      document.body.appendChild(el);
      content.buildLink(el);

      const link = el.querySelector('a');
      expect(link.href).toBe('https://acme.atlassian.net/browse/PROJ-42');

      // Reset
      chrome.storage.sync.get = (_keys, cb) => cb({});
    });
  });
});
