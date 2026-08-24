import React, { useState, useEffect } from 'react';
import { Uploader } from './components/Uploader';

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

interface Run {
  id: string;
  projectId: string;
  status: string;
  progressPercent: number;
  currentStep: string | null;
}

interface PublishOp {
  id: string;
  state: 'pending' | 'requested' | 'confirmed' | 'failed' | 'uncertain';
  destinationBucket: string;
  destinationKey: string;
  lastErrorMessage: string | null;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<SeedUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeRuns, setActiveRuns] = useState<Record<string, Run>>({});
  const [publishOps, setPublishOps] = useState<Record<string, PublishOp>>({});
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});

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

  const handleProcessRun = async (projectId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': currentUser.workspaceId,
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ sourceAssetId: 'asset_src_demo' }),
      });
      const run = await res.json();
      setActiveRuns((prev) => ({ ...prev, [projectId]: run }));
      fetchProjects();
    } catch (err) {
      console.error('Failed to process run', err);
    }
  };

  const handleApprove = async (runId: string, projectId: string) => {
    if (!currentUser) return;
    await fetch(`/api/v1/runs/${runId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': currentUser.workspaceId,
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ note: 'Approved via Web UI' }),
    });
    fetchProjects();
    setActiveRuns((prev) => {
      const copy = { ...prev };
      if (copy[projectId]) copy[projectId].status = 'approved';
      return copy;
    });
  };

  const handleReject = async (runId: string, projectId: string) => {
    if (!currentUser) return;
    const reason = rejectionReason[runId] || 'Color grading does not match brand guidelines.';
    await fetch(`/api/v1/runs/${runId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': currentUser.workspaceId,
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ reason }),
    });
    fetchProjects();
    setActiveRuns((prev) => {
      const copy = { ...prev };
      if (copy[projectId]) copy[projectId].status = 'rejected';
      return copy;
    });
  };

  const handlePublish = async (runId: string, simulateLoss = false) => {
    if (!currentUser) return;
    const res = await fetch('/api/v1/publish/trigger', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': currentUser.workspaceId,
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ runId, sourceAssetId: 'asset_src_demo', profile: '720p', simulateResponseLoss: simulateLoss }),
    });
    const op = await res.json();
    setPublishOps((prev) => ({ ...prev, [runId]: op }));
  };

  const handleReconcile = async (operationId: string, runId: string) => {
    if (!currentUser) return;
    const res = await fetch(`/api/v1/publish/${operationId}/reconcile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': currentUser.workspaceId,
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ reason: 'HEAD evidence confirmed object exists on delivery bucket' }),
    });
    const op = await res.json();
    setPublishOps((prev) => ({ ...prev, [runId]: op }));
  };

  return (
    <div style={{ maxWidth: '960px', margin: '40px auto', padding: '0 20px' }}>
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
              placeholder="Nhập tên project video (ví dụ: TVC Summer Campaign)..."
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
              Chưa có project nào thuộc workspace này. Bạn hãy gõ tên ở trên và bấm "Tạo Project"!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {projects.map((p) => {
                const activeRun = activeRuns[p.id];
                const pubOp = activeRun ? publishOps[activeRun.id] : null;

                return (
                  <div
                    key={p.id}
                    style={{
                      background: '#1e293b',
                      padding: '20px',
                      borderRadius: '8px',
                      borderLeft: '4px solid #38bdf8',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '18px', color: '#f8fafc' }}>{p.name}</strong>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                          ID: {p.id} | Ngày tạo: {new Date(p.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '6px 12px',
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

                    {/* Component Multipart Uploader */}
                    <div style={{ marginTop: '15px' }}>
                      <Uploader
                        projectId={p.id}
                        workspaceId={currentUser?.workspaceId || ''}
                        userId={currentUser?.id || ''}
                        onUploadComplete={() => fetchProjects()}
                      />
                    </div>

                    {/* Action & Run Progress */}
                    <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #334155', display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button
                        onClick={() => handleProcessRun(p.id)}
                        style={{
                          padding: '8px 16px',
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        ⚡ Khởi chạy Xử lý (Process Video)
                      </button>
                    </div>

                    {/* Live Progress Bar */}
                    {activeRun && (
                      <div style={{ marginTop: '15px', background: '#0f172a', padding: '15px', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                          <span>Trạng thái Xử lý: <strong style={{ color: '#38bdf8' }}>{activeRun.status}</strong></span>
                          <span>Bước: <code style={{ color: '#f59e0b' }}>{activeRun.currentStep || 'queued'}</code> ({activeRun.progressPercent}%)</span>
                        </div>
                        <div style={{ background: '#334155', borderRadius: '4px', height: '12px', overflow: 'hidden' }}>
                          <div style={{ width: `${activeRun.progressPercent}%`, background: '#10b981', height: '100%', transition: 'width 0.4s ease' }} />
                        </div>

                        {/* Reviewer Action Buttons */}
                        {activeRun.status === 'awaiting_approval' && (
                          <div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button
                              onClick={() => handleApprove(activeRun.id, p.id)}
                              style={{ padding: '8px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              ✅ Reviewer Approve
                            </button>
                            <input
                              type="text"
                              placeholder="Lý do từ chối (10-1000 ký tự)..."
                              value={rejectionReason[activeRun.id] || ''}
                              onChange={(e) => setRejectionReason({ ...rejectionReason, [activeRun.id]: e.target.value })}
                              style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #475569', background: '#1e293b', color: '#fff' }}
                            />
                            <button
                              onClick={() => handleReject(activeRun.id, p.id)}
                              style={{ padding: '8px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              ❌ Reviewer Reject
                            </button>
                          </div>
                        )}

                        {/* Approved -> Trigger Publish Controls */}
                        {activeRun.status === 'approved' && (
                          <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #334155' }}>
                            <div style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '8px', fontSize: '14px' }}>
                              🚀 Publish Delivery (Bàn giao sang MinIO Delivery Bucket):
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button
                                onClick={() => handlePublish(activeRun.id, false)}
                                style={{ padding: '8px 14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                              >
                                📤 Publish Delivery Thành Công
                              </button>
                              <button
                                onClick={() => handlePublish(activeRun.id, true)}
                                style={{ padding: '8px 14px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                              >
                                ⚠️ Giả lập Lỗi Mất Mạng FL-04 (Uncertain State)
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Publish Result Display */}
                        {pubOp && (
                          <div style={{ marginTop: '15px', padding: '12px', background: pubOp.state === 'uncertain' ? '#78350f' : '#064e3b', borderRadius: '6px' }}>
                            <div style={{ fontWeight: 'bold', color: '#fff' }}>
                              Trạng thái Publish: <span style={{ color: pubOp.state === 'uncertain' ? '#fde047' : '#34d399' }}>{pubOp.state.toUpperCase()}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '4px' }}>
                              Target Bucket: <code>{pubOp.destinationBucket}</code> | Key: <code>{pubOp.destinationKey}</code>
                            </div>
                            {pubOp.lastErrorMessage && (
                              <div style={{ fontSize: '12px', color: '#fef08a', marginTop: '4px' }}>
                                Message: {pubOp.lastErrorMessage}
                              </div>
                            )}

                            {/* Operator Reconcile Button */}
                            {pubOp.state === 'uncertain' && (
                              <button
                                onClick={() => handleReconcile(pubOp.id, activeRun.id)}
                                style={{ marginTop: '10px', padding: '6px 12px', background: '#ca8a04', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                              >
                                ⚖️ Operator Reconcile (HEAD Evidence Verification)
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
