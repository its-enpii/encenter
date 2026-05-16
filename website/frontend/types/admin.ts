export interface ServerGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
  servers_count?: number;
}

export interface Server {
  id: string;
  user_id: string;
  group_id: string | null;
  label: string;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'private_key';
  notes: string | null;
  is_active: boolean;
  last_connected: string | null;
  created_at: string;
  updated_at: string;
  group?: ServerGroup;
}

export interface DatabaseConnection {
  id: string;
  server_id: string;
  label: string;
  db_type: 'mysql' | 'mariadb' | 'postgresql';
  db_host: string;
  db_port: number;
  db_name: string;
  db_username: string;
  is_active: boolean;
  notes: string | null;
  server?: Server;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  resource_id: string | null;
  meta: Record<string, unknown>;
  ip_address: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
  };
}
