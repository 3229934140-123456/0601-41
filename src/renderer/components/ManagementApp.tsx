import React, { useState } from 'react';

interface Participant {
  id: string;
  name: string;
  avatar: string;
  status: 'good' | 'warning' | 'bad';
  joinTime: string;
  duration: string;
  online: boolean;
}

interface Anomaly {
  id: string;
  type: 'error' | 'warning';
  title: string;
  desc: string;
  time: string;
}

interface Record {
  id: string;
  title: string;
  date: string;
  duration: string;
  participants: number;
}

const ManagementApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const [participants] = useState<Participant[]>([
    { id: 'p1', name: '张三', avatar: '👨', status: 'good', joinTime: '14:00', duration: '45分钟', online: true },
    { id: 'p2', name: '李四', avatar: '👩', status: 'good', joinTime: '14:02', duration: '43分钟', online: true },
    { id: 'p3', name: '王五', avatar: '🧑', status: 'warning', joinTime: '14:05', duration: '40分钟', online: true },
    { id: 'p4', name: '赵六', avatar: '👨‍🦱', status: 'good', joinTime: '14:10', duration: '35分钟', online: true },
    { id: 'p5', name: '钱七', avatar: '👩‍🦰', status: 'bad', joinTime: '14:08', duration: '37分钟', online: true },
    { id: 'p6', name: '孙八', avatar: '🧔', status: 'good', joinTime: '14:15', duration: '30分钟', online: false },
    { id: 'p7', name: '周九', avatar: '👴', status: 'good', joinTime: '14:20', duration: '25分钟', online: true },
    { id: 'p8', name: '吴十', avatar: '👵', status: 'warning', joinTime: '14:25', duration: '20分钟', online: true },
  ]);

  const [anomalies] = useState<Anomaly[]>([
    { id: 'a1', type: 'error', title: '网络连接异常 - 钱七', desc: '网络延迟超过500ms，可能影响音视频质量', time: '5分钟前' },
    { id: 'a2', type: 'warning', title: 'CPU占用过高 - 王五', desc: '系统资源占用率达85%，建议关闭其他程序', time: '10分钟前' },
    { id: 'a3', type: 'warning', title: '音频质量下降 - 吴十', desc: '检测到音频丢包，语音可能不清晰', time: '15分钟前' },
  ]);

  const [records] = useState<Record[]>([
    { id: 'rec1', title: '产品培训会议', date: '2026-06-07', duration: '2小时30分', participants: 23 },
    { id: 'rec2', title: '新人入职培训', date: '2026-06-06', duration: '3小时15分', participants: 15 },
    { id: 'rec3', title: '技术分享会', date: '2026-06-05', duration: '1小时45分', participants: 67 },
    { id: 'rec4', title: '季度总结会议', date: '2026-06-03', duration: '2小时00分', participants: 45 },
  ]);

  const [recordFilter, setRecordFilter] = useState('all');

  const navItems = [
    { id: 'overview', icon: '📊', name: '数据概览' },
    { id: 'participants', icon: '👥', name: '参会者管理' },
    { id: 'anomalies', icon: '⚠️', name: '异常监控' },
    { id: 'records', icon: '📋', name: '会议记录' },
  ];

  const onlineCount = participants.filter(p => p.online).length;
  const goodConnection = participants.filter(p => p.status === 'good').length;
  const warningConnection = participants.filter(p => p.status === 'warning').length;
  const badConnection = participants.filter(p => p.status === 'bad').length;

  const getStatusText = (status: string) => {
    switch (status) {
      case 'good': return '良好';
      case 'warning': return '一般';
      case 'bad': return '较差';
      default: return '未知';
    }
  };

  const exportRecords = async () => {
    const result = await window.electronAPI.showSaveDialog({
      defaultPath: '参会记录.csv',
      filters: [
        { name: 'CSV File', extensions: ['csv'] },
        { name: 'Excel File', extensions: ['xlsx'] },
      ],
    });
    if (!result.canceled) {
      console.log('导出到:', result.filePath);
    }
  };

  return (
    <div className="management-container">
      <header className="header">
        <h1>⚙️ 管理控制台</h1>
        <div className="nav-buttons">
          <button className="btn btn-secondary" onClick={() => window.electronAPI.openWindow('lobby')}>
            🏠 大厅
          </button>
          <button className="btn btn-primary" onClick={exportRecords}>
            📤 导出数据
          </button>
        </div>
      </header>

      <div className="management-main">
        <div className="management-sidebar">
          {navItems.map(item => (
            <div
              key={item.id}
              className={`management-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.name}</span>
            </div>
          ))}
        </div>

        <div className="management-content">
          {activeTab === 'overview' && (
            <div>
              <h2 className="section-title">📊 数据概览</h2>
              
              <div className="stats-grid">
                <div className="stat-card primary">
                  <div className="icon">👥</div>
                  <div className="number">{onlineCount}</div>
                  <div className="label">在线人数</div>
                </div>
                <div className="stat-card success">
                  <div className="icon">✅</div>
                  <div className="number">{goodConnection}</div>
                  <div className="label">连接良好</div>
                </div>
                <div className="stat-card warning">
                  <div className="icon">⚠️</div>
                  <div className="number">{warningConnection}</div>
                  <div className="label">连接一般</div>
                </div>
                <div className="stat-card danger">
                  <div className="icon">❌</div>
                  <div className="number">{badConnection}</div>
                  <div className="label">连接异常</div>
                </div>
              </div>

              <h2 className="section-title" style={{ marginTop: '30px' }}>📈 实时监控</h2>
              
              <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '16px' }}>网络质量分布</h3>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div style={{ flex: 1, height: '20px', borderRadius: '10px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${(goodConnection / participants.length * 100).toFixed(0)}%`, background: '#38ef7d' }}></div>
                    <div style={{ width: `${(warningConnection / participants.length * 100).toFixed(0)}%`, background: '#f5b342' }}></div>
                    <div style={{ width: `${(badConnection / participants.length * 100).toFixed(0)}%`, background: '#eb3349' }}></div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                    <span>🟢 良好</span>
                    <span>🟡 一般</span>
                    <span>🔴 异常</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                <div className="card">
                  <h3 style={{ marginBottom: '12px' }}>🎤 语音统计</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                    <span style={{ color: '#888' }}>当前发言</span>
                    <span>2 人</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                    <span style={{ color: '#888' }}>麦克风开启</span>
                    <span>5 人</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#888' }}>麦克风关闭</span>
                    <span>{onlineCount - 5} 人</span>
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ marginBottom: '12px' }}>💬 互动统计</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                    <span style={{ color: '#888' }}>举手次数</span>
                    <span>12 次</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
                    <span style={{ color: '#888' }}>投票参与</span>
                    <span>23 人</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: '#888' }}>白板操作</span>
                    <span>45 次</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'participants' && (
            <div>
              <h2 className="section-title">👥 参会者管理</h2>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  placeholder="搜索参会者..."
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                    flex: '1',
                    minWidth: '200px',
                  }}
                />
                <select 
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: 'white',
                  }}
                >
                  <option>全部分组</option>
                  <option>一组</option>
                  <option>二组</option>
                  <option>三组</option>
                </select>
                <button className="btn btn-primary">导出列表</button>
              </div>

              <div className="participants-table">
                <div className="table-header">
                  <div className="col-name">参会者</div>
                  <div className="col-status">连接状态</div>
                  <div className="col-join-time">加入时间</div>
                  <div className="col-duration">参会时长</div>
                  <div className="col-actions">操作</div>
                </div>
                {participants.map(p => (
                  <div key={p.id} className="table-row">
                    <div className="col-name">
                      <div className="avatar-small">{p.avatar}</div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: '#888' }}>
                          {p.online ? '在线' : '离线'}
                        </div>
                      </div>
                    </div>
                    <div className="col-status">
                      <span className={`connection-status ${p.status}`}>
                        <span className="status-dot"></span>
                        {getStatusText(p.status)}
                      </span>
                    </div>
                    <div className="col-join-time">{p.joinTime}</div>
                    <div className="col-duration">{p.duration}</div>
                    <div className="col-actions">
                      <button className="action-icon-btn" title="静音">🔇</button>
                      <button className="action-icon-btn" title="查看详情">👁️</button>
                      <button className="action-icon-btn" title="移除">✖️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'anomalies' && (
            <div className="anomaly-section">
              <h2 className="section-title">⚠️ 异常监控</h2>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <span className={`status-badge ${anomalies.filter(a => a.type === 'error').length > 0 ? 'status-warning' : 'status-active'}`}>
                  {anomalies.filter(a => a.type === 'error').length} 个严重
                </span>
                <span className={`status-badge ${anomalies.filter(a => a.type === 'warning').length > 0 ? 'status-warning' : 'status-inactive'}`}>
                  {anomalies.filter(a => a.type === 'warning').length} 个警告
                </span>
              </div>

              {anomalies.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">✅</div>
                  <p>一切正常，无异常连接</p>
                </div>
              ) : (
                <div className="anomaly-list">
                  {anomalies.map(anomaly => (
                    <div 
                      key={anomaly.id} 
                      className={`anomaly-item ${anomaly.type === 'warning' ? 'warning' : ''}`}
                    >
                      <div className="anomaly-icon">
                        {anomaly.type === 'error' ? '❌' : '⚠️'}
                      </div>
                      <div className="anomaly-info">
                        <div className="title">{anomaly.title}</div>
                        <div className="desc">{anomaly.desc}</div>
                      </div>
                      <div className="anomaly-time">{anomaly.time}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="card" style={{ marginTop: '30px' }}>
                <h3 style={{ marginBottom: '14px' }}>🛡️ 自动处理</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                    <span>网络异常时自动提醒</span>
                    <div className="toggle-switch active"></div>
                  </label>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                    <span>自动重连检测</span>
                    <div className="toggle-switch active"></div>
                  </label>
                  <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                    <span>异常情况自动记录</span>
                    <div className="toggle-switch active"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div className="records-section">
              <h2 className="section-title">📋 会议记录</h2>
              
              <div className="records-filter">
                <div 
                  className={`filter-item ${recordFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setRecordFilter('all')}
                >
                  全部记录
                </div>
                <div 
                  className={`filter-item ${recordFilter === 'thisMonth' ? 'active' : ''}`}
                  onClick={() => setRecordFilter('thisMonth')}
                >
                  本月
                </div>
                <div 
                  className={`filter-item ${recordFilter === 'thisWeek' ? 'active' : ''}`}
                  onClick={() => setRecordFilter('thisWeek')}
                >
                  本周
                </div>
                <div 
                  className={`filter-item ${recordFilter === 'today' ? 'active' : ''}`}
                  onClick={() => setRecordFilter('today')}
                >
                  今天
                </div>
              </div>

              {records.map(record => (
                <div key={record.id} className="record-card">
                  <div className="info">
                    <div className="title">📅 {record.title}</div>
                    <div className="meta">
                      <span>📅 {record.date}</span>
                      <span>⏱️ {record.duration}</span>
                      <span>👥 {record.participants} 人参与</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}>
                      📊 详情
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px 14px', fontSize: '13px' }}
                      onClick={exportRecords}
                    >
                      📤 导出
                    </button>
                  </div>
                </div>
              ))}

              <button className="btn btn-secondary" style={{ width: '100%', marginTop: '16px' }}>
                📂 加载更多记录
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagementApp;
