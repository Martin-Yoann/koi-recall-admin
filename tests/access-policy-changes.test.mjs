import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPolicyChanges } from '../src/lib/access-policy-changes.ts';

const fixture = () => ({
  revision: 1,
  isOwner: true,
  permissions: ['case.detail.read', 'case.assign'],
  roles: {
    ADMIN: { name: 'Admin', permissions: ['case.detail.read', 'case.assign'] },
    MANAGER: { name: 'Manager', permissions: ['case.detail.read'] },
    COMPLIANCE: { name: 'Compliance', permissions: [] },
  },
  permissionNames: { 'case.detail.read': 'View cases', 'case.assign': 'Assign cases' },
});

test('permission ordering and server metadata do not create unsaved changes', () => {
  const base = fixture();
  const next = structuredClone(base);
  next.roles.ADMIN.permissions.reverse();
  next.revision++;
  next.isOwner = false;
  next.permissions = [];
  assert.deepEqual(getPolicyChanges(base, next), []);
});

test('reverting every field and grant clears the dirty state', () => {
  const base = fixture();
  const next = structuredClone(base);
  next.roles.MANAGER.permissions.push('case.assign');
  next.permissionNames['case.assign'] = 'Assign orders';
  assert.equal(getPolicyChanges(base, next).length, 2);
  next.roles.MANAGER.permissions.pop();
  next.permissionNames['case.assign'] = base.permissionNames['case.assign'];
  assert.deepEqual(getPolicyChanges(base, next), []);
});

test('review identifies each grant, revocation, role rename, and permission rename', () => {
  const base = fixture();
  const next = structuredClone(base);
  next.roles.MANAGER.name = 'Operations';
  next.roles.MANAGER.permissions = ['case.assign'];
  next.permissionNames['case.assign'] = '分配工单';
  const changes = getPolicyChanges(base, next);
  assert.equal(changes.length, 4);
  assert.deepEqual(
    new Set(changes.map((change) => change.id)),
    new Set([
      'role:MANAGER',
      'grant:MANAGER:case.detail.read',
      'grant:MANAGER:case.assign',
      'permission:case.assign',
    ]),
  );
  assert.ok(changes.some((change) => change.description.includes('Grant “分配工单” for Operations')));
  assert.ok(changes.some((change) => change.description.includes('Revoke “View cases” from Operations')));
  assert.deepEqual(base, fixture());
});


test('tracks creation, description edits, and deletion of arbitrary role IDs', () => {
  const base = fixture();
  const created = structuredClone(base);
  created.roles.role_support = { name: 'Support', description: 'Case support', permissions: ['case.detail.read'] };
  assert.deepEqual(getPolicyChanges(base, created).map((change) => change.id), ['role:role_support']);
  const edited = structuredClone(created);
  edited.roles.role_support.description = 'Updated description';
  assert.deepEqual(getPolicyChanges(created, edited).map((change) => change.id), ['description:role_support']);
  assert.deepEqual(getPolicyChanges(created, base).map((change) => change.id), ['role:role_support']);
});
