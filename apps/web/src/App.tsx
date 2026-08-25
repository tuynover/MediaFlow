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

interface UploadedAsset {
  id: string;
  projectId: string;
  workspaceId: string;
  originalFilename: string;
  bucket: string;
  objectKey: string;
  sizeBytes: number;
  completedAt: string;
}

interface Run {
  id: string;
  projectId: string;
  sourceAssetId: string;
  status: string;
  progressPercent: number;
  currentStep: string | null;
  reason?: string;
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
  const [projectAssets, setProjectAssets] = useState<Record<string, UploadedAsset[]>>({});
  const [newProjectName, setNewProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const [projectRuns, setProjectRuns] = useState<Record<string, Run[]>>({});
  const [publishOps, setPublishOps] = useState<Record<string, PublishOp>>({});
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
  const [rejectionError, setRejectionError] = useState<Record<string, string>>({});
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [expandedReview, setExpandedReview] = useState<Record<string, boolean>>({});

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
    let timer: any;
    if (currentUser) {
      setProjectRuns({});
      setPublishOps({});
      setRejectionError({});
      setProjectAssets({});
      fetchProjects();

      // Setup 1-second interval to continuously sync all runs per project
      timer = setInterval(() => {
        fetchActiveRuns();
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentUser]);

  const isProducer = currentUser?.roles.includes('producer');
  const isReviewer = currentUser?.roles.includes('reviewer');

  const fetchActiveRuns = async () => {
    if (!currentUser) return;
    try {
      const runsRes = await fetch('/api/v1/operator/runs', {
        headers: {
          'x-workspace-id': currentUser.workspaceId,
          'x-user-id': currentUser.id,
        },
      });
      const runsData = await runsRes.json();
      const runsGrouped: Record<string, Run[]> = {};
      (runsData.runs || []).forEach((r: any) => {
        if (!runsGrouped[r.projectId]) runsGrouped[r.projectId] = [];
        runsGrouped[r.projectId].push(r);
      });
      setProjectRuns(runsGrouped);
    } catch (err) {
      console.error('Failed to fetch active runs', err);
    }
  };

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
      const projList: Project[] = data.projects || [];
      setProjects(projList);

      // Fetch uploaded assets for each project
      projList.forEach(async (p) => {
        try {
          const assetsRes = await fetch(`/api/v1/projects/${p.id}/assets`, {
            headers: {
              'x-workspace-id': currentUser.workspaceId,
              'x-user-id': currentUser.id,
            },
          });
          const assetsData = await assetsRes.json();
          setProjectAssets((prev) => ({ ...prev, [p.id]: assetsData.assets || [] }));
        } catch (assetErr) {
          console.error('Failed to fetch project assets', assetErr);
        }
      });

      await fetchActiveRuns();
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !currentUser || !isProducer) return;

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

  const handleProcessRunForAsset = async (projectId: string, asset: UploadedAsset) => {
    if (!currentUser || !isProducer) return;
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': currentUser.workspaceId,
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({ sourceAssetId: asset.id }),
      });
      const run = await res.json();

      setProjectRuns((prev) => {
        const existing = prev[projectId] || [];
        const filtered = existing.filter((r) => r.sourceAssetId !== asset.id);
        return { ...prev, [projectId]: [...filtered, run] };
      });

      setTimeout(() => fetchActiveRuns(), 200);
      setTimeout(() => fetchActiveRuns(), 500);
      setTimeout(() => fetchActiveRuns(), 1000);
    } catch (err) {
      console.error('Failed to process run', err);
    }
  };

  const handleDeleteAsset = async (projectId: string, assetId: string) => {
    if (!currentUser || !isProducer) return;
    try {
      await fetch(`/api/v1/projects/${projectId}/assets/${assetId}`, {
        method: 'DELETE',
        headers: {
          'x-workspace-id': currentUser.workspaceId,
          'x-user-id': currentUser.id,
        },
      });
      fetchProjects();
    } catch (err) {
      console.error('Failed to delete asset', err);
    }
  };

  const handleApprove = async (runId: string, projectId: string) => {
    if (!currentUser || !isReviewer) return;
    await fetch(`/api/v1/runs/${runId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': currentUser.workspaceId,
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ note: 'Approved via Reviewer Inbox' }),
    });
    fetchActiveRuns();
    fetchProjects();
  };

  const handleReject = async (runId: string, projectId: string) => {
    if (!currentUser || !isReviewer) return;
    const reason = rejectionReason[runId] || '';

    if (reason.length < 10) {
      setRejectionError({ ...rejectionError, [runId]: '❌ Lý do từ chối phải dài từ 10 đến 1000 ký tự!' });
      return;
    }
    setRejectionError({ ...rejectionError, [runId]: '' });

    await fetch(`/api/v1/runs/${runId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': currentUser.workspaceId,
        'x-user-id': currentUser.id,
      },
      body: JSON.stringify({ reason }),
    });

    // Update local run status persistently to 'rejected'
    setProjectRuns((prev) => {
      const runs = prev[projectId] || [];
      const updated = runs.map((r) => (r.id === runId ? { ...r, status: 'rejected', reason } : r));
      return { ...prev, [projectId]: updated };
    });

    fetchActiveRuns();
    fetchProjects();
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

        {/* Tenant & Role Switcher */}
        <div style={{ marginTop: '20px', background: '#1e293b', padding: '15px', borderRadius: '8px' }}>
          <label htmlFor="seed-user-select" style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            🔒 Chuyển đổi Vai trò & Tài khoản (Kiểm thử Role-Based Authorization & Tenant Isolation):
          </label>
          <select
            id="seed-user-select"
            name="seed_user_select"
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
          <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#cbd5e1' }}>
            <span>Current Workspace ID: <code style={{ color: '#f59e0b' }}>{currentUser?.workspaceId}</code></span>
            <span>Quyền hạn khả dụng (Role): <strong style={{ color: isProducer ? '#38bdf8' : '#10b981' }}>{currentUser?.roles.join(', ').toUpperCase()}</strong></span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* PRODUCER ONLY SECTION: Create Project Form */}
        {isProducer && (
          <section style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '18px', marginTop: 0, color: '#f8fafc' }}>➕ [Producer Panel] Tạo Media Project Mới</h2>
            <form onSubmit={handleCreateProject} style={{ display: 'flex', gap: '10px' }}>
              <label htmlFor="new-project-input" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
                Tên Project Video
              </label>
              <input
                id="new-project-input"
                name="new_project_name"
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
        )}

        {/* REVIEWER ONLY BANNER: Reviewer Inbox Header */}
        {isReviewer && (
          <section style={{ background: '#064e3b', padding: '15px 20px', borderRadius: '8px', marginBottom: '30px', border: '1px solid #10b981' }}>
            <h2 style={{ fontSize: '18px', marginTop: 0, color: '#ecfdf5' }}>📥 [Reviewer Inbox] Danh sách Bản xem trước chờ Phê duyệt</h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#a7f3d0' }}>
              Bạn đang ở giao diện Reviewer. Bấm nút <strong>👁️ Xem video & Phê duyệt</strong> bên dưới từng video để mở khung phát video và phê duyệt.
            </p>
          </section>
        )}

        {/* Project List */}
        <section>
          <h2 style={{ fontSize: '18px', color: '#f8fafc' }}>
            📁 Danh sách Project ({currentUser?.displayName})
          </h2>

          {loading ? (
            <p style={{ color: '#94a3b8' }}>Đang tải danh sách project...</p>
          ) : projects.length === 0 ? (
            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#94a3b8' }}>
              {isProducer
                ? 'Chưa có project nào thuộc workspace này. Bạn hãy gõ tên ở trên và bấm "Tạo Project"!'
                : 'Hiện tại chưa có đợt xử lý video nào cần Reviewer duyệt trong Workspace này.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {projects.map((p) => {
                const assets = projectAssets[p.id] || [];
                const runs = projectRuns[p.id] || [];

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
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Trạng thái Project:</span>
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
                    </div>

                    {/* PRODUCER ONLY: Component Multipart Uploader */}
                    {isProducer && (
                      <div style={{ marginTop: '15px' }}>
                        <Uploader
                          projectId={p.id}
                          workspaceId={currentUser?.workspaceId || ''}
                          userId={currentUser?.id || ''}
                          onUploadComplete={(url) => {
                            setVideoUrls((prev) => ({ ...prev, [p.id]: url }));
                            fetchProjects();
                          }}
                        />
                      </div>
                    )}

                    {/* PERMANENT UPLOADED ASSETS LIST IN MINIO WITH DELETE & COLLAPSIBLE REVIEW */}
                    {assets.length > 0 && (
                      <div style={{ marginTop: '15px', background: '#0f172a', padding: '15px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '10px' }}>
                          📦 Danh sách Video Assets đã nạp lên MinIO Source Bucket ({assets.length}):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {assets.map((asset) => {
                            const assetRun = runs.find((r) => r.sourceAssetId === asset.id || runs.length === 1);
                            const pubOp = assetRun ? publishOps[assetRun.id] : null;
                            const isExpanded = assetRun ? expandedReview[assetRun.id] : false;

                            return (
                              <div key={asset.id} style={{ background: '#1e293b', padding: '12px 15px', borderRadius: '6px', border: '1px solid #334155' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div>
                                    <strong style={{ color: '#ecfdf5', fontSize: '14px' }}>📹 {asset.originalFilename}</strong>
                                    <span style={{ color: '#94a3b8', marginLeft: '10px', fontSize: '12px' }}>({(asset.sizeBytes / (1024 * 1024)).toFixed(2)} MB)</span>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                      Bucket: <code style={{ color: '#f59e0b' }}>{asset.bucket}</code> | Asset ID: <code>{asset.id}</code>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <span style={{ color: '#34d399', fontWeight: 'bold', fontSize: '11px' }}>
                                      ✅ Completed ({new Date(asset.completedAt).toLocaleTimeString('vi-VN')})
                                    </span>

                                    {/* PRODUCER: Delete Asset Button */}
                                    {isProducer && (
                                      <button
                                        onClick={() => handleDeleteAsset(p.id, asset.id)}
                                        style={{
                                          padding: '5px 10px',
                                          background: '#7f1d1d',
                                          color: '#fca5a5',
                                          border: '1px solid #991b1b',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          fontWeight: 'bold',
                                          fontSize: '12px',
                                        }}
                                      >
                                        🗑️ Xóa Video
                                      </button>
                                    )}

                                    {/* PRODUCER: Process Run Button */}
                                    {isProducer && (
                                      <button
                                        onClick={() => handleProcessRunForAsset(p.id, asset)}
                                        style={{
                                          padding: '6px 12px',
                                          background: '#10b981',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          fontWeight: 'bold',
                                          fontSize: '12px',
                                        }}
                                      >
                                        ⚡ Khởi chạy Xử lý Video Này
                                      </button>
                                    )}

                                    {/* REVIEWER: Toggle Video Preview Button */}
                                    {isReviewer && assetRun && assetRun.status === 'awaiting_approval' && (
                                      <button
                                        onClick={() => setExpandedReview({ ...expandedReview, [assetRun.id]: !isExpanded })}
                                        style={{
                                          padding: '6px 12px',
                                          background: isExpanded ? '#0284c7' : '#059669',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          fontWeight: 'bold',
                                          fontSize: '12px',
                                        }}
                                      >
                                        {isExpanded ? '🙈 Ẩn Khung Duyệt' : '👁️ Xem Video & Phê Duyệt'}
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* PROCESS RUN PROGRESS BAR & REJECTION BADGE */}
                                {assetRun && (
                                  <div style={{ marginTop: '12px', background: '#0f172a', padding: '12px', borderRadius: '6px', border: '1px solid #334155' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                                      <span>Trạng thái Xử lý (Run): <strong style={{ color: assetRun.status === 'rejected' ? '#ef4444' : assetRun.status === 'awaiting_approval' ? '#10b981' : '#38bdf8' }}>{assetRun.status.toUpperCase()}</strong></span>
                                      <span>Bước: <code style={{ color: '#f59e0b' }}>{assetRun.currentStep || 'queued'}</code> ({assetRun.progressPercent}%)</span>
                                    </div>
                                    <div style={{ background: '#334155', borderRadius: '4px', height: '10px', overflow: 'hidden' }}>
                                      <div style={{ width: `${assetRun.progressPercent}%`, background: assetRun.status === 'rejected' ? '#ef4444' : '#10b981', height: '100%', transition: 'width 0.4s ease' }} />
                                    </div>

                                    {/* PERMANENT REJECTION BADGE */}
                                    {assetRun.status === 'rejected' && (
                                      <div style={{ marginTop: '10px', padding: '10px', background: '#7f1d1d', borderRadius: '6px', border: '1px solid #ef4444' }}>
                                        <div style={{ fontSize: '13px', color: '#fecaca', fontWeight: 'bold' }}>
                                          ❌ Video đã bị Reviewer từ chối (REJECTED)!
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#fca5a5', marginTop: '4px' }}>
                                          Lý do từ chối: <em>"{assetRun.reason || rejectionReason[assetRun.id] || 'Chất lượng video chưa đạt yêu cầu brand.'}"</em>
                                        </div>
                                        {isProducer && (
                                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                                            💡 Bạn có thể bấm nút <strong>🗑️ Xóa Video</strong> ở trên để nạp bản cắt mới hoặc bấm <strong>⚡ Khởi chạy Xử lý Video Này</strong> để chạy lại!
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* COLLAPSIBLE REVIEWER PANEL (Shown only when Reviewer clicks 👁️ Xem video & Phê duyệt) */}
                                    {assetRun.status === 'awaiting_approval' && isReviewer && isExpanded && (
                                      <div style={{ marginTop: '12px', background: '#1e293b', padding: '12px', borderRadius: '6px', border: '1px solid #059669' }}>
                                        <div style={{ fontWeight: 'bold', color: '#10b981', marginBottom: '8px', fontSize: '13px' }}>
                                          📥 Reviewer Approval Control Panel ({asset.originalFilename}):
                                        </div>

                                        <div style={{ marginBottom: '10px', background: '#020617', padding: '8px', borderRadius: '6px' }}>
                                          <video
                                            controls
                                            src={videoUrls[p.id] || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'}
                                            style={{ width: '100%', maxHeight: '240px', borderRadius: '4px', backgroundColor: '#000' }}
                                          />
                                        </div>

                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                          <button
                                            onClick={() => handleApprove(assetRun.id, p.id)}
                                            style={{ padding: '6px 12px', background: '#059669', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                          >
                                            ✅ Approve (Duyệt bàn giao)
                                          </button>
                                          <input
                                            id={`reject-reason-${assetRun.id}`}
                                            name={`reject_reason_${assetRun.id}`}
                                            type="text"
                                            placeholder="Nhập lý do từ chối (bắt buộc từ 10 đến 1000 ký tự)..."
                                            value={rejectionReason[assetRun.id] || ''}
                                            onChange={(e) => setRejectionReason({ ...rejectionReason, [assetRun.id]: e.target.value })}
                                            style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#fff', fontSize: '12px' }}
                                          />
                                          <button
                                            onClick={() => handleReject(assetRun.id, p.id)}
                                            style={{ padding: '6px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                          >
                                            ❌ Reject (Từ chối)
                                          </button>
                                        </div>
                                        {rejectionError[assetRun.id] && (
                                          <div style={{ marginTop: '8px', fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>
                                            {rejectionError[assetRun.id]}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* PRODUCER VIEW WHEN AWAITING APPROVAL */}
                                    {assetRun.status === 'awaiting_approval' && isProducer && (
                                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>
                                        ✅ Video "{asset.originalFilename}" đã nén và kiểm chứng thành công (100%). Đang chờ Reviewer duyệt!
                                      </div>
                                    )}

                                    {/* Approved -> Trigger Publish Controls */}
                                    {assetRun.status === 'approved' && (
                                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #334155' }}>
                                        <div style={{ fontWeight: 'bold', color: '#38bdf8', marginBottom: '6px', fontSize: '13px' }}>
                                          🚀 Publish Delivery (Bàn giao sang MinIO Delivery Bucket):
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                          <button
                                            onClick={() => handlePublish(assetRun.id, false)}
                                            style={{ padding: '6px 12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                          >
                                            📤 Publish Delivery Thành Công
                                          </button>
                                          <button
                                            onClick={() => handlePublish(assetRun.id, true)}
                                            style={{ padding: '6px 12px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                                          >
                                            ⚠️ Giả lập Lỗi Mất Mạng FL-04 (Uncertain State)
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Publish Result Display */}
                                    {pubOp && (
                                      <div style={{ marginTop: '10px', padding: '10px', background: pubOp.state === 'uncertain' ? '#78350f' : '#064e3b', borderRadius: '6px' }}>
                                        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '13px' }}>
                                          Trạng thái Publish: <span style={{ color: pubOp.state === 'uncertain' ? '#fde047' : '#34d399' }}>{pubOp.state.toUpperCase()}</span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                                          Target Bucket: <code>{pubOp.destinationBucket}</code> | Key: <code>{pubOp.destinationKey}</code>
                                        </div>
                                        {pubOp.state === 'uncertain' && (
                                          <button
                                            onClick={() => handleReconcile(pubOp.id, assetRun.id)}
                                            style={{ marginTop: '8px', padding: '4px 10px', background: '#ca8a04', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}
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
