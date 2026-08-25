import { createDatabaseClient, workspaces, users } from '@mediaflow/database';

async function seedDatabase() {
  console.log('🌱 Connecting to PostgreSQL & Seeding Data...');
  const db = createDatabaseClient();

  const wsAcmeId = 'a0000000-0000-7000-a000-000000000001';
  const wsBetaId = 'b0000000-0000-7000-b000-000000000002';

  // Seed Workspaces
  await db
    .insert(workspaces)
    .values([
      { id: wsAcmeId, slug: 'acme-studio', name: 'Acme Studio' },
      { id: wsBetaId, slug: 'beta-studio', name: 'Beta Studio' },
    ])
    .onConflictDoNothing();

  // Seed Users
  await db
    .insert(users)
    .values([
      {
        id: '11111111-1111-7111-a111-111111111111',
        workspaceId: wsAcmeId,
        email: 'producer@acme.local',
        passwordHash: 'argon2id_mock_hash_producer',
        displayName: 'Acme Producer',
        roles: ['producer'],
      },
      {
        id: '11111111-1111-7111-a111-222222222222',
        workspaceId: wsAcmeId,
        email: 'reviewer@acme.local',
        passwordHash: 'argon2id_mock_hash_reviewer',
        displayName: 'Acme Reviewer',
        roles: ['reviewer'],
      },
      {
        id: '11111111-1111-7111-a111-333333333333',
        workspaceId: wsAcmeId,
        email: 'operator@acme.local',
        passwordHash: 'argon2id_mock_hash_operator',
        displayName: 'Acme Operator',
        roles: ['operator'],
      },
      {
        id: '22222222-2222-7222-b222-111111111111',
        workspaceId: wsBetaId,
        email: 'producer@beta.local',
        passwordHash: 'argon2id_mock_hash_producer',
        displayName: 'Beta Producer',
        roles: ['producer'],
      },
      {
        id: '22222222-2222-7222-b222-222222222222',
        workspaceId: wsBetaId,
        email: 'reviewer@beta.local',
        passwordHash: 'argon2id_mock_hash_reviewer',
        displayName: 'Beta Reviewer',
        roles: ['reviewer'],
      },
      {
        id: '22222222-2222-7222-b222-333333333333',
        workspaceId: wsBetaId,
        email: 'operator@beta.local',
        passwordHash: 'argon2id_mock_hash_operator',
        displayName: 'Beta Operator',
        roles: ['operator'],
      },
    ])
    .onConflictDoNothing();

  console.log('✅ Seed Database Complete!');
}

seedDatabase().catch((err) => {
  console.error('Seed Error:', err);
});
