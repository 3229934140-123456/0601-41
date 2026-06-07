import React, { useState, useMemo, useEffect } from 'react';
import { useRooms, useCurrentRoom, storeActions, Room, getRoomStatus, getRoomStatusText, getRoomStatusClass } from '../hooks/useStore';

const LobbyApp: React.FC = () => {
  const rooms = useRooms();
  const currentRoom = useCurrentRoom();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'schedule'>('card');
  const [scheduleFilter, setScheduleFilter] = useState<'today' | 'week' | 'all'>('today');
  const [, forceUpdate] = useState(0);
  
  const [newRoom, setNewRoom] = useState({
    name: '',
    theme: '科技蓝',
    capacity: 30,
    permission: 'invite',
    startTime: '',
    endTime: '',
    topic: '',
    notes: '',
  });

  const [filter, setFilter] = useState('all');

  const themes = [
    { name: '科技蓝', class: 'theme-tech', color: '#667eea' },
    { name: '清新绿', class: 'theme-green', color: '#38ef7d' },
    { name: '商务灰', class: 'theme-grey', color: '#8e9eab' },
    { name: '温馨橙', class: 'theme-orange', color: '#f5576c' },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      forceUpdate(prev => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const getStatusText = (room: Room) => getRoomStatusText(room);
  const getStatusClass = (room: Room) => getRoomStatusClass(room);

  const getThemeBg = (theme: string) => {
    if (theme.startsWith('linear-gradient')) return theme;
    const t = themes.find(th => th.name === theme);
    return t ? t.color : '#667eea';
  };

  const formatTime = (datetime?: string) => {
    if (!datetime) return '';
    return datetime.split(' ')[1] || datetime;
  };

  const formatDate = (datetime?: string) => {
    if (!datetime) return '';
    return datetime.split(' ')[0] || datetime;
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr.startsWith(today) || dateStr === '2026-06-08';
  };

  const isThisWeek = (dateStr: string) => {
    if (isToday(dateStr)) return true;
    const roomDate = new Date(dateStr);
    const today = new Date('2026-06-08');
    const diffDays = Math.floor((roomDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 6;
  };

  const filteredRooms = useMemo(() => {
    let result = rooms;
    
    if (filter === 'active') {
      result = result.filter(r => getRoomStatus(r) === 'active');
    } else if (filter === 'scheduled') {
      result = result.filter(r => getRoomStatus(r) === 'inactive');
    } else if (filter === 'ended') {
      result = result.filter(r => getRoomStatus(r) === 'ended');
    }

    if (viewMode === 'schedule') {
      if (scheduleFilter === 'today') {
        result = result.filter(r => r.startTime && isToday(r.startTime));
      } else if (scheduleFilter === 'week') {
        result = result.filter(r => r.startTime && isThisWeek(r.startTime));
      }
    }

    return result;
  }, [rooms, filter, viewMode, scheduleFilter, forceUpdate]);

  const totalOnline = useMemo(() => 
    rooms.reduce((sum, r) => sum + r.online, 0), 
    [rooms]
  );

  const activeCount = useMemo(() => 
    rooms.filter(r => getRoomStatus(r) === 'active').length, 
    [rooms, forceUpdate]
  );

  const scheduledCount = useMemo(() => 
    rooms.filter(r => getRoomStatus(r) === 'inactive').length, 
    [rooms, forceUpdate]
  );

  const endedCount = useMemo(() => 
    rooms.filter(r => getRoomStatus(r) === 'ended').length, 
    [rooms, forceUpdate]
  );

  const handleCreateRoom = async () => {
    if (!newRoom.name.trim()) return;
    
    await storeActions.addRoom({
      name: newRoom.name,
      theme: newRoom.theme,
      capacity: newRoom.capacity,
      permission: newRoom.permission,
      startTime: newRoom.startTime,
      endTime: newRoom.endTime,
      topic: newRoom.topic,
      notes: newRoom.notes,
    });

    setShowCreateModal(false);
    setNewRoom({ 
      name: '', 
      theme: '科技蓝', 
      capacity: 30, 
      permission: 'invite',
      startTime: '',
      endTime: '',
      topic: '',
      notes: '',
    });
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
          <div className="stat-item">
            <div className="number">{scheduledCount}</div>
            <div className="label">待开始</div>
          </div>
          <div className="stat-item">
            <div className="number">{endedCount}</div>
            <div className="label">已结束</div>
          </div>
        </div>
      </div>

      <div className="room-section">
        <div className="section-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2>虚拟会议室</h2>
            <div className="view-toggle">
              <button 
                className={`toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
                onClick={() => setViewMode('card')}
              >
                📦 卡片
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'schedule' ? 'active' : ''}`}
                onClick={() => setViewMode('schedule')}
              >
                📅 日程
              </button>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            ➕ 创建房间
          </button>
        </div>

        <div className="filter-bar">
          {viewMode === 'card' && (
            <>
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
              <div 
                className={`filter-item ${filter === 'ended' ? 'active' : ''}`}
                onClick={() => setFilter('ended')}
              >
                已结束
              </div>
            </>
          )}
          {viewMode === 'schedule' && (
            <>
              <div 
                className={`filter-item ${scheduleFilter === 'today' ? 'active' : ''}`}
                onClick={() => setScheduleFilter('today')}
              >
                今天
              </div>
              <div 
                className={`filter-item ${scheduleFilter === 'week' ? 'active' : ''}`}
                onClick={() => setScheduleFilter('week')}
              >
                本周
              </div>
              <div 
                className={`filter-item ${scheduleFilter === 'all' ? 'active' : ''}`}
                onClick={() => setScheduleFilter('all')}
              >
                全部
              </div>
            </>
          )}
        </div>

        {viewMode === 'card' && (
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
                  <span className={`status-badge ${getStatusClass(room)}`}>
                    {getStatusText(room)}
                  </span>
                </div>
                {room.topic && (
                  <div className="room-topic" style={{ 
                    fontSize: '12px', 
                    color: '#667eea', 
                    marginTop: '8px',
                    fontWeight: '500',
                  }}>
                    📌 {room.topic}
                  </div>
                )}
                {room.startTime && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#999', 
                    marginTop: '6px',
                  }}>
                    ⏰ {room.startTime}
                  </div>
                )}
                {room.description && (
                  <div style={{ 
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
        )}

        {viewMode === 'schedule' && (
          <div className="schedule-list">
            {filteredRooms.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📅</div>
                <p>暂无会议安排</p>
              </div>
            ) : (
              filteredRooms.map(room => (
                <div 
                  key={room.id} 
                  className="schedule-item"
                  onClick={() => enterRoom(room)}
                >
                  <div className="schedule-time">
                    <div className="time-main">{formatTime(room.startTime)}</div>
                    <div className="time-sub">{formatDate(room.startTime)}</div>
                  </div>
                  <div 
                    className="schedule-bar"
                    style={{ background: getThemeBg(room.theme) }}
                  ></div>
                  <div className="schedule-info">
                    <div className="schedule-name">{room.name}</div>
                    {room.topic && (
                      <div className="schedule-topic">📌 {room.topic}</div>
                    )}
                    <div className="schedule-meta">
                      <span>👤 {room.host}</span>
                      <span>👥 {room.online}/{room.capacity} 人</span>
                      {room.endTime && <span>⏱️ {formatTime(room.startTime)} - {formatTime(room.endTime)}</span>}
                    </div>
                  </div>
                  <div className="schedule-status">
                    <span className={`status-badge ${getStatusClass(room)}`}>
                      {getStatusText(room)}
                    </span>
                    <button className="btn btn-primary" style={{ marginTop: '8px' }}>
                      进入
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>创建虚拟房间</h2>
            
            <div className="form-group">
              <label>房间名称 *</label>
              <input 
                type="text" 
                placeholder="请输入房间名称"
                value={newRoom.name}
                onChange={e => setNewRoom({...newRoom, name: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>培训主题</label>
              <input 
                type="text" 
                placeholder="请输入培训主题"
                value={newRoom.topic}
                onChange={e => setNewRoom({...newRoom, topic: e.target.value})}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>开始时间</label>
                <input 
                  type="datetime-local" 
                  value={newRoom.startTime.replace(' ', 'T')}
                  onChange={e => setNewRoom({...newRoom, startTime: e.target.value.replace('T', ' ')})}
                />
              </div>
              <div className="form-group">
                <label>结束时间</label>
                <input 
                  type="datetime-local" 
                  value={newRoom.endTime.replace(' ', 'T')}
                  onChange={e => setNewRoom({...newRoom, endTime: e.target.value.replace('T', ' ')})}
                />
              </div>
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

            <div className="form-row">
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
            </div>

            <div className="form-group">
              <label>备注</label>
              <textarea
                placeholder="请输入备注信息"
                value={newRoom.notes}
                onChange={e => setNewRoom({...newRoom, notes: e.target.value})}
                style={{ minHeight: '60px', resize: 'vertical' }}
              />
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
