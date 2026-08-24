import React, { useState, useEffect } from 'react';

interface SeedUser {
  id: string;
  workspaceId: string;
  email: string;
  displayName: string;
  roles: string[];
}

interface Project {
  id: string;
  name: string;
  status: string;
  workspaceId: string;
  createdAt: string;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<SeedUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(false);

  // Seed User Options for Testing
  const seedUsers: SeedUser[] = [
    {
      id: '11111111-1111-7111-a111-111111111111',
      workspaceId: 'a0000000-0000-7000-a000-000000000001',
      email: 'producer@acme.local',
      displayName: 'Acme Producer (Workspace A)',
      roles: ['producer'],
    },
    {
      id: '11111111-1111-7111-a111-222222222222',
      workspaceId: 'a0000000-0000-7000-a000-000000000001',
      email: 'reviewer@acme.local',
      displayName: 'Acme Reviewer (Workspace A)',
      roles: ['reviewer'],
    },
    {
      id: '22222222-2222-7222-b222-111111111111',
      workspaceId: 'b0000000-0000-7000-b000-000000000002',
      email: 'producer@beta.local',
      displayName: 'Beta Producer (Workspace B)',
      roles: ['producer'],
    },
  ];

  useEffect(() => {
    // Default select first seed user
    if (!currentUser) {
      setCurrentUser(seedUsers[0]);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchProjects();
    }
  }, [currentUser]);

  const fetchProjects = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/projects', {
        headers: {
          'x-workspace-id': currentUser.workspaceId,
          'x-user-id': currentUser.id,
        },
      });
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !currentUser) return;

    try {
      const res = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': currentUser.workspaceId,
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ name: newProjectName }),
      });
      if (res.ok) {
        setNewProjectName('');
        fetchProjects();
      }
    } catch (err) {
      console.error('Failed to create project', err);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
      <header style={{ borderBottom: '1px solid #334155', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, color: '#38bdf8' }}>🎬 MediaFlow Baseline v1</h1>
        <p style={{ color: '#94a3b8', marginTop: '5px' }}>
          NestJS Backend + React Vite Frontend — Realtime Media Processing Portal
        </p>

        {/* Tenant Switcher */}
        <div style={{ marginTop: '20px', background: '#1e293b', padding: '15px', borderRadius: '8px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            🔒 Chuyển đổi Tài khoản Seed (Kiểm thử Tenant Isolation):
          </label>
          <select
            value={currentUser?.id}
            onChange={(e) => {
              const selected = seedUsers.find((u) => u.id === e.target.value);
              if (selected) setCurrentUser(selected);
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #475569',
              background: '#0f172a',
              color: '#fff',
              width: '100%',
              fontSize: '14px',
            }}
          >
            {seedUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName} — [{u.email}]
              </option>
            ))}
          </select>
          <div style={{ marginTop: '8px', fontSize: '12px', color: '#cbd5e1' }}>
            Current Workspace ID: <code style={{ color: '#f59e0b' }}>{currentUser?.workspaceId}</code>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Create Project Form */}
        <section style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '18px', marginTop: 0, color: '#f8fafc' }}>➕ Tạo Media Project Mới</h2>
          <form onSubmit={handleCreateProject} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Nhập tên project video..."
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '6px',
                border: '1px solid #475569',
                background: '#0f172a',
                color: '#fff',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                background: '#0284c7',
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Tạo Project
            </button>
          </form>
        </section>

        {/* Project List */}
        <section>
          <h2 style={{ fontSize: '18px', color: '#f8fafc' }}>
            📁 Danh sách Project ({currentUser?.displayName})
          </h2>

          {loading ? (
            <p style={{ color: '#94a3b8' }}>Đang tải danh sách project...</p>
          ) : projects.length === 0 ? (
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
              Chưa có project nào thuộc workspace này.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {projects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: '#1e293b',
                    padding: '15px 20px',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderLeft: '4px solid #38bdf8',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '16px', color: '#f8fafc' }}>{p.name}</strong>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                      ID: {p.id} | Ngày tạo: {new Date(p.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: '#334155',
                      color: '#38bdf8',
                    }}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
