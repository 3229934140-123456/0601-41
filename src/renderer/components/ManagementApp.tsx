import React, { useState, useMemo } from 'react';
import { 
  useParticipants, 
  useRooms, 
  useGroupsWithColors, 
  storeActions, 
  getAvatarColor,
  getGroupColor
} from '../hooks/useStore';

const ManagementApp: React.FC = () => {
  const participants = useParticipants();
  const rooms = useRooms();
  const groups = useGroupsWithColors();
  const [activeTab, setActiveTab] = useState('participants');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string | 'all'>('all');

  const filteredParticipants = useMemo(() => {
    let result = participants;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.role.toLowerCase().includes(query)
      );
    }
    
    if (selectedGroup !== 'all') {
      result = result.filter(p => p.group === selectedGroup);
    }
    
    return result;
  }, [participants, searchQuery, selectedGroup]);

  const exportFilteredAttendance = async () => {
    const result = await storeActions.showSaveDialog({
      defaultPath: '参会人员列表.csv',
      filters: [{ name: 'CSV File', extensions: ['csv'] }],
    });

    if (!result.canceled && result.filePath) {
      const filter: { search?: string; group?: string } = {};
      if (searchQuery.trim()) filter.search = searchQuery;
      if (selectedGroup !== 'all') filter.group = selectedGroup;
      await storeActions.exportAttendanceCSV(result.filePath, filter);
    }
  };

  const toggleMute = (id: string) => {
    storeActions.toggleMute(id);
  };

  const removeParticipant = (id: string) => {
    storeActions.removeParticipant(id);
  };

  const changeGroup = (id: string, group: string) => {
    storeActions.changeGroup(id, group);
  };

  const stats = {
    total: participants.length,
    online: participants.filter(p => p.online).length,
    offline: participants.filter(p => !p.online).length,
    muted: participants.filter(p => p.muted).length,
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'host': return '主持人';
      case 'cohost': return '副主持';
      default: return '参会者';
    }
  };

  const openWindow = (name: string) => {
    storeActions.openWindow(name);
  };

  return (
    <div className="management-container">
      <header className="header">
        <h1>🎛️ 管理控制台</h1>
        <div className="nav-buttons">
          <button className="btn btn-secondary" onClick={() => openWindow('lobby')}>
            🏛️ 大厅
          </button>
          <button className="btn btn-secondary" onClick={() => openWindow('room')}>
            🏠 房间
          </button>
          <button className="btn btn-primary" onClick={exportFilteredAttendance}>
            📥 导出列表
          </button>
        </div>
      </header>

      <div className="management-main">
        <div className="management-left">
          <div className="tab-buttons">
            <button
              className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
              onClick={() => setActiveTab('participants')}
            >
              👥 参会者管理
            </button>
            <button
              className={`tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
              onClick={() => setActiveTab('rooms')}
            >
              🏠 房间管理
            </button>
            <button
              className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveTab('groups')}
            >
              👨‍👩‍👧‍👦 分组管理
            </button>
          </div>

          {activeTab === 'participants' && (
            <div className="tab-content">
              <div className="search-bar">
                <input
                  type="text"
                  className="search-input"
                  placeholder="🔍 搜索姓名或角色..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-tags">
                <button 
                  className={`filter-tag ${selectedGroup === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedGroup('all')}
                >
                  全部 ({participants.length})
                </button>
                {groups.map(g => (
                  <button
                    key={g.id}
                    className={`filter-tag ${selectedGroup === g.name ? 'active' : ''}`}
                    onClick={() => setSelectedGroup(g.name)}
                    style={{ 
                      borderColor: g.color, 
                      color: selectedGroup === g.name ? g.color : undefined 
                    }}
                  >
                    {g.name} ({participants.filter(p => p.group === g.name).length})
                  </button>
                ))}
              </div>

              <div className="result-info">
                显示 {filteredParticipants.length} / {participants.length} 人
              </div>

              <div className="participant-grid">
                {filteredParticipants.map(p => (
                  <div key={p.id} className="mgmt-participant-card">
                    <div className="card-header">
                      <div className="avatar" style={{ backgroundColor: getAvatarColor(p.name) }}>
                        {p.name[0]}
                      </div>
                      <div className="info">
                        <div className="name">{p.name}</div>
                        <div className="role">{getRoleLabel(p.role)}</div>
                      </div>
                      <span className={`status-dot ${p.online ? 'online' : 'offline'}`}></span>
                    </div>
                    
                    <div className="card-body">
                      <div className="info-row">
                        <span>分组</span>
                        <select
                          className="mini-select"
                          value={p.group}
                          onChange={(e) => changeGroup(p.id, e.target.value)}
                        >
                          {groups.map(g => (
                            <option key={g.id} value={g.name}>{g.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="info-row">
                        <span>座位</span>
                        <span>{p.seat ? `座位 ${p.seat}` : '未分配'}</span>
                      </div>
                      <div className="info-row">
                        <span>麦克风</span>
                        <span className={p.muted ? 'warning' : 'success'}>
                          {p.muted ? '🔇 静音' : '🎤 开启'}
                        </span>
                      </div>
                      <div className="info-row">
                        <span>连接状态</span>
                        <span className={p.connectionStatus === 'good' ? 'success' : p.connectionStatus === 'warning' ? 'warning' : 'muted'}>
                          {p.connectionStatus === 'good' ? '良好' : p.connectionStatus === 'warning' ? '一般' : '较差'}
                        </span>
                      </div>
                    </div>

                    <div className="card-actions">
                      <button 
                        className="mini-btn"
                        onClick={() => toggleMute(p.id)}
                      >
                        {p.muted ? '🔊 取消静音' : '🔇 静音'}
                      </button>
                      <button 
                        className="mini-btn danger"
                        onClick={() => removeParticipant(p.id)}
                      >
                        🚫 移除
                      </button>
                    </div>
                  </div>
                ))}

                {filteredParticipants.length === 0 && (
                  <div className="empty-state">
                    <div className="icon">🔍</div>
                    <p>没有找到匹配的参会者</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'rooms' && (
            <div className="tab-content">
              <div className="room-list">
                {rooms.map(room => (
                  <div key={room.id} className="room-card">
                    <div className="room-thumb" style={{ background: room.theme }}>
                      <span className="room-icon">🏠</span>
                    </div>
                    <div className="room-info">
                      <div className="room-name">{room.name}</div>
                      <div className="room-desc">{room.description || '暂无描述'}</div>
                      <div className="room-stats">
                        <span>👥 {room.participantCount} 人</span>
                        <span className={`room-status ${room.status === 'active' ? 'active' : ''}`}>
                          {room.status === 'active' ? '进行中' : '未开始'}
                        </span>
                      </div>
                    </div>
                    <div className="room-actions">
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => {
                          storeActions.setCurrentRoom(room.id);
                          storeActions.openWindow('room');
                        }}
                      >
                        进入房间
                      </button>
                      <button className="action-icon-btn">⚙️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="tab-content">
              <div className="groups-list">
                {groups.map(group => {
                  const groupMembers = participants.filter(p => p.group === group.name);
                  return (
                    <div key={group.id} className="group-card">
                      <div className="group-header">
                        <div 
                          className="group-color-indicator"
                          style={{ backgroundColor: group.color }}
                        ></div>
                        <h3 style={{ color: group.color }}>{group.name}</h3>
                        <span className="group-count">{groupMembers.length} 人</span>
                      </div>
                      
                      <div className="group-members">
                        {groupMembers.map(m => (
                          <div key={m.id} className="group-member">
                            <div className="avatar-sm" style={{ backgroundColor: getAvatarColor(m.name) }}>
                              {m.name[0]}
                            </div>
                            <span className="name">{m.name}</span>
                            <span className={`status-dot ${m.online ? 'online' : 'offline'}`}></span>
                          </div>
                        ))}
                        {groupMembers.length === 0 && (
                          <div className="empty-small">暂无成员</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="management-right">
          <h3>📊 数据概览</h3>
          
          <div className="stat-grid">
            <div className="stat-card small">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">总人数</div>
            </div>
            <div className="stat-card small">
              <div className="stat-value success">{stats.online}</div>
              <div className="stat-label">在线</div>
            </div>
            <div className="stat-card small">
              <div className="stat-value muted">{stats.offline}</div>
              <div className="stat-label">离线</div>
            </div>
            <div className="stat-card small">
              <div className="stat-value warning">{stats.muted}</div>
              <div className="stat-label">静音</div>
            </div>
          </div>

          <h3 style={{ marginTop: '24px' }}>⚠️ 异常连接</h3>
          <div className="abnormal-list">
            {participants.filter(p => !p.online || p.connectionStatus === 'bad').length === 0 ? (
              <div className="empty-state small">
                <div className="icon">✅</div>
                <p>暂无异常连接</p>
              </div>
            ) : (
              participants.filter(p => !p.online || p.connectionStatus === 'bad').map(p => (
                <div key={p.id} className="abnormal-item">
                  <div className="avatar-sm" style={{ backgroundColor: getAvatarColor(p.name) }}>
                    {p.name[0]}
                  </div>
                  <div className="info">
                    <div className="name">{p.name}</div>
                    <div className="reason">
                      {!p.online ? '连接断开' : '网络较差'}
                    </div>
                  </div>
                  <button className="mini-btn">重连</button>
                </div>
              ))
            )}
          </div>

          <h3 style={{ marginTop: '24px' }}>⚡ 快捷操作</h3>
          <div className="quick-actions">
            <button 
              className="quick-action-btn"
              onClick={() => storeActions.muteAll()}
            >
              🔇 全体静音
            </button>
            <button className="quick-action-btn">
              📢 全员广播
            </button>
            <button className="quick-action-btn">
              🎯 锁定房间
            </button>
            <button className="quick-action-btn danger">
              🚪 结束会议
            </button>
          </div>

          <h3 style={{ marginTop: '24px' }}>📝 系统日志</h3>
          <div className="log-list">
            <div className="log-item">
              <span className="time">14:32:05</span>
              <span className="msg">张三加入房间</span>
            </div>
            <div className="log-item">
              <span className="time">14:31:42</span>
              <span className="msg">李四被移至第2组</span>
            </div>
            <div className="log-item warning">
              <span className="time">14:30:18</span>
              <span className="msg">王五网络不稳定</span>
            </div>
            <div className="log-item">
              <span className="time">14:28:55</span>
              <span className="msg">开始录制片段 1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagementApp;
