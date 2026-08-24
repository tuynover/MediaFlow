import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginInput, User } from '@mediaflow/contracts';

// In-Memory Seed Users for Baseline (Acme Studio & Beta Studio)
const SEED_USERS: User[] = [
  {
    id: '11111111-1111-7111-a111-111111111111',
    workspaceId: 'a0000000-0000-7000-a000-000000000001', // Acme Studio
    email: 'producer@acme.local',
    displayName: 'Acme Producer',
    roles: ['producer'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '11111111-1111-7111-a111-222222222222',
    workspaceId: 'a0000000-0000-7000-a000-000000000001', // Acme Studio
    email: 'reviewer@acme.local',
    displayName: 'Acme Reviewer',
    roles: ['reviewer'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '11111111-1111-7111-a111-333333333333',
    workspaceId: 'a0000000-0000-7000-a000-000000000001', // Acme Studio
    email: 'operator@acme.local',
    displayName: 'Acme Operator',
    roles: ['operator'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '22222222-2222-7222-b222-111111111111',
    workspaceId: 'b0000000-0000-7000-b000-000000000002', // Beta Studio
    email: 'producer@beta.local',
    displayName: 'Beta Producer',
    roles: ['producer'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '22222222-2222-7222-b222-222222222222',
    workspaceId: 'b0000000-0000-7000-b000-000000000002', // Beta Studio
    email: 'reviewer@beta.local',
    displayName: 'Beta Reviewer',
    roles: ['reviewer'],
    createdAt: new Date().toISOString(),
  },
  {
    id: '22222222-2222-7222-b222-333333333333',
    workspaceId: 'b0000000-0000-7000-b000-000000000002', // Beta Studio
    email: 'operator@beta.local',
    displayName: 'Beta Operator',
    roles: ['operator'],
    createdAt: new Date().toISOString(),
  },
];

@Injectable()
export class AuthService {
  async validateUser(input: LoginInput): Promise<User> {
    const user = SEED_USERS.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }
    return user;
  }

  getSeedUsers(): User[] {
    return SEED_USERS;
  }
}
