export type UserRole = 'Customer' | 'Support Agent' | 'Senior Support Staff' | 'Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  team?: string;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface AuthSessionResponse {
  user: User;
  token?: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UserDetailResponse extends User {
  stats: {
    assignedTickets: number;
    resolvedTickets: number;
    openTickets: number;
  };
  auditTrail: Array<{
    id: string;
    actorId: string;
    actorName: string;
    action: string;
    targetId: string;
    outcome: string;
    details?: string;
    timestamp: string;
  }>;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetId: string;
  outcome: string;
  details?: string;
  timestamp: string;
}

