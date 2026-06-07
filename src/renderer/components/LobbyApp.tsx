import React, { useState, useMemo } from 'react';
import { useRooms, useCurrentRoom, storeActions, Room } from '../hooks/useStore';

const LobbyApp: React.FC = () => {
  const rooms = useRooms();
  const currentRoom = useCurrentRoom();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    theme: '科技蓝',
    capacity: 30,
    permission: 'invite',
  });
  const [filter, setFilter] = useState('all');

  const themes = [
    { name: '科技蓝', class: 'theme-tech', color: '#667eea' },
    { name: '清新绿', class: 'theme-green', color: '#38ef7d' },
    { name: '商务灰', class: 'theme-grey', color: '#8e9eab' },
    { name: '温馨橙', class: 'theme-orange', color: '#f5576c' },
  ];

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '进行中';
      case 'inactive': return '未开始';
      case '进行中': return '进行中';
      case '未开始': return '未开始';
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    if (status === 'active' || status === '进行中') return 'status-active';
    return 'status-inactive';
  };

  const handleCreateRoom = async () => {
    if (!newRoom.name.trim()) return;
    
    await storeActions.addRoom({
      name: newRoom.name,
      theme: newRoom.theme,
      capacity: newRoom.capacity,
      permission: newRoom.permission,
    });

    setShowCreateModal(false);
    setNewRoom({ name: '', theme: '科技蓝', capacity: 30, permission: 'invite' });
  };

  const enterRoom = async (room: Room) => {
    await storeActions.setCurrentRoom(room.id);
    await storeActions.openWindow('room');
  };

  const openCurrentRoom = () => {
    if (currentRoom) {
      storeActions.openWindow('room');
    } else if (rooms.length > 0) {
      enterRoom(rooms[0]);
    }
  };

  const openWindow = (name: string) => {
    storeActions.openWindow(name);
  };

  const getThemeBg = (theme: string) => {
    if (theme.startsWith('linear-gradient')) return theme;
    const t = themes.find(th => th.name === theme);
    return t ? t.color : '#667eea';
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      if (filter === 'all') return true;
      if (filter === 'active') return room.status === 'active' || room.status === '进行中';
      if (filter === 'scheduled') return room.status === 'inactive' || room.status === '未开始';
      return true;
    });
  }, [rooms, filter]);

  const totalOnline = useMemo(() => 
    rooms.reduce((sum, r) => sum + r.online, 0), 
    [rooms]
  );

  const activeCount = useMemo(() => 
    rooms.filter(r => r.status === 'active' || r.status === '进行中').length, 
    [rooms]
  );

  return (
    <div className="lobby-container">
      <header className="header">
        <h1>🌌 元宇宙培训平台</h1>
        <div className="nav-buttons">
          <button className="btn btn-secondary" onClick={() => openWindow('character')}>
            👤 角色
          </button>
          <button className="btn btn-secondary" onClick={openCurrentRoom}>
            🏠 房间
          </button>
          <button className="btn btn-secondary" onClick={() => openWindow('whiteboard')}>
            📝 白板
          </button>
          <button className="btn btn-secondary" onClick={() => openWindow('activity')}>
            🎮 活动
          </button>
          <button className="btn btn-secondary" onClick={() => openWindow('recording')}>
            ⏺️ 录制
          </button>
          <button className="btn btn-secondary" onClick={() => openWindow('management')}>
            ⚙️ 管理
          </button>
        </div>
      </header>

      <div className="lobby-hero">
        <h1>欢迎来到元宇宙大厅</h1>
        <p>沉浸式远程培训与虚拟会议体验</p>
        <div className="stats-bar">
          <div className="stat-item">
            <div className="number">{rooms.length}</div>
            <div className="label">会议室</div>
          </div>
          <div className="stat-item">
            <div className="number">{totalOnline}</div>
            <div className="label">在线人数</div>
          </div>
          <div className="stat-item">
            <div className="number">{activeCount}</div>
            <div className="label">进行中</div>
          </div>
        </div>
      </div>

      <div className="room-section">
        <div className="section-header">
          <h2>虚拟会议室</h2>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            ➕ 创建房间
          </button>
        </div>

        <div className="filter-bar">
          <div 
            className={`filter-item ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            全部
          </div>
          <div 
            className={`filter-item ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            进行中
          </div>
          <div 
            className={`filter-item ${filter === 'scheduled' ? 'active' : ''}`}
            onClick={() => setFilter('scheduled')}
          >
            未开始
          </div>
        </div>

        <div className="room-grid">
          {filteredRooms.map(room => (
            <div 
              key={room.id} 
              className="card room-card"
              onClick={() => enterRoom(room)}
            >
              <div 
                className="room-theme"
                style={{ background: getThemeBg(room.theme) }}
              ></div>
              <h3>{room.name}</h3>
              <div className="room-info">
                <span>👥 {room.online}/{room.capacity}</span>
                <span className={`status-badge ${getStatusClass(room.status)}`}>
                  {getStatusText(room.status)}
                </span>
              </div>
              {room.description && (
                <div className="room-desc" style={{ 
                  fontSize: '12px', 
                  color: '#999', 
                  marginTop: '8px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {room.description}
                </div>
              )}
              <div className="room-footer">
                <div className="host-info">
                  <div className="host-avatar">👨‍💼</div>
                  <span>主持人：{room.host}</span>
                </div>
                <button className="btn btn-primary enter-btn">进入</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>创建虚拟房间</h2>
            
            <div className="form-group">
              <label>房间名称</label>
              <input 
                type="text" 
                placeholder="请输入房间名称"
                value={newRoom.name}
                onChange={e => setNewRoom({...newRoom, name: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>空间主题</label>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {themes.map(theme => (
                  <div
                    key={theme.name}
                    onClick={() => setNewRoom({...newRoom, theme: theme.name})}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: newRoom.theme === theme.name ? `2px solid ${theme.color}` : '2px solid transparent',
                      background: 'rgba(255, 255, 255, 0.05)',
                      fontSize: '13px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span style={{ 
                      display: 'inline-block', 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      background: theme.color,
                      marginRight: '8px',
                      verticalAlign: 'middle',
                    }}></span>
                    {theme.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>容纳人数</label>
              <select 
                value={newRoom.capacity}
                onChange={e => setNewRoom({...newRoom, capacity: Number(e.target.value)})}
              >
                <option value={10}>10 人</option>
                <option value={30}>30 人</option>
                <option value={50}>50 人</option>
                <option value={100}>100 人</option>
                <option value={200}>200 人</option>
              </select>
            </div>

            <div className="form-group">
              <label>入场权限</label>
              <select 
                value={newRoom.permission}
                onChange={e => setNewRoom({...newRoom, permission: e.target.value})}
              >
                <option value="invite">仅邀请可入</option>
                <option value="password">密码进入</option>
                <option value="open">公开开放</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreateRoom}>
                创建房间
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LobbyApp;
