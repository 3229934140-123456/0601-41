import React, { useState, useMemo } from 'react';
import { useParticipants, useCurrentRoom, useGroups, storeActions, Participant } from '../hooks/useStore';

const RoomApp: React.FC = () => {
  const participants = useParticipants();
  const room = useCurrentRoom();
  const groups = useGroups();
  
  const [activeTab, setActiveTab] = useState('participants');
  const [hostView, setHostView] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showHostControlPanel, setShowHostControlPanel] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteGroup, setInviteGroup] = useState('一组');
  const [taskGroup, setTaskGroup] = useState('一组');
  const [taskContent, setTaskContent] = useState('');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [draggedParticipant, setDraggedParticipant] = useState<string | null>(null);
  const [dragOverSeat, setDragOverSeat] = useState<number | null>(null);

  const onlineCount = useMemo(() => 
    participants.filter(p => p.online).length, 
    [participants]
  );

  const cohosts = useMemo(() => 
    participants.filter(p => p.role === 'cohost'), 
    [participants]
  );

  const getFilteredParticipants = () => {
    if (selectedGroup === 'all') return participants;
    return participants.filter(p => p.group === selectedGroup);
  };

  const getParticipantAtSeat = (seatNum: number): Participant | undefined => {
    return participants.find(p => p.seat === seatNum && p.online);
  };

  const getSeatsInRow = (rowIndex: number): number[] => {
    const seats: number[] = [];
    for (let i = 1; i <= 4; i++) {
      seats.push(rowIndex * 4 + i);
    }
    return seats;
  };

  const handleDragStart = (e: React.DragEvent, participantId: string) => {
    setDraggedParticipant(participantId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, seatNumber: number) => {
    e.preventDefault();
    setDragOverSeat(seatNumber);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setDragOverSeat(null);
  };

  const handleDrop = async (e: React.DragEvent, targetSeat: number) => {
    e.preventDefault();
    setDragOverSeat(null);
    
    if (!draggedParticipant) return;
    
    const targetParticipant = participants.find(p => p.seat === targetSeat);
    
    if (targetParticipant) {
      await storeActions.swapSeats(draggedParticipant, targetParticipant.id);
    } else {
      await storeActions.moveToSeat(draggedParticipant, targetSeat);
    }
    
    setDraggedParticipant(null);
  };

  const handleDragEnd = () => {
    setDraggedParticipant(null);
    setDragOverSeat(null);
  };

  const toggleMute = async (id: string) => {
    await storeActions.toggleMute(id);
  };

  const handleMuteAll = async () => {
    await storeActions.muteAll();
  };

  const inviteParticipant = async () => {
    if (!inviteName.trim()) return;
    
    await storeActions.addParticipant({
      name: inviteName,
      group: inviteGroup,
      avatar: '🧑',
    });
    
    setInviteName('');
    setShowInviteModal(false);
  };

  const removeParticipant = async (id: string) => {
    await storeActions.removeParticipant(id);
  };

  const changeParticipantGroup = async (id: string, group: string) => {
    await storeActions.changeGroup(id, group);
  };

  const toggleCohost = async (id: string) => {
    const participant = participants.find(p => p.id === id);
    if (!participant) return;
    const isCohost = participant.role === 'cohost';
    await storeActions.setCohost(id, !isCohost);
  };

  const toggleDiscussionMode = async (group: string) => {
    if (!room) return;
    const currentGroupTasks = room.groupTasks || {};
    const isDiscussion = currentGroupTasks[`discussion_${group}`] === 'true';
    await storeActions.setDiscussionMode(room.id, group, !isDiscussion);
  };

  const sendGroupTask = async () => {
    if (!taskContent.trim() || !room) return;
    await storeActions.setGroupTask(room.id, taskGroup, taskContent);
    setTaskContent('');
    setShowTaskModal(false);
  };

  const openWindow = (name: string) => {
    storeActions.openWindow(name);
  };

  const toggleMic = () => setIsMicOn(!isMicOn);
  const toggleCamera = () => setIsCameraOn(!isCameraOn);
  const toggleScreenShare = () => setIsScreenSharing(!isScreenSharing);

  const getGroupMembers = (group: string) => {
    return participants.filter(p => p.group === group);
  };

  const handleMoveToGroup = async (participantId: string, targetGroup: string) => {
    await storeActions.changeGroup(participantId, targetGroup);
  };

  const isGroupDiscussionMode = (group: string) => {
    if (!room || !room.groupTasks) return false;
    return room.groupTasks[`discussion_${group}`] === 'true';
  };

  const getGroupTask = (group: string) => {
    if (!room || !room.groupTasks) return '';
    return room.groupTasks[group] || '';
  };

  const getRoleLabel = (role?: string) => {
    if (role === 'host') return '主持人';
    if (role === 'cohost') return '联席主持';
    return '参会者';
  };

  const getRoleBadgeClass = (role?: string) => {
    if (role === 'host') return 'role-host';
    if (role === 'cohost') return 'role-cohost';
    return 'role-participant';
  };

  return (
    <div className="room-container">
      <header className="header">
        <div>
          <h1>🏠 {room?.name || '虚拟会议室'}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <span className="status-badge status-active">
              {room?.status || '进行中'} · {onlineCount} 人在线
            </span>
            {room?.topic && (
              <span style={{ fontSize: '12px', color: '#667eea' }}>
                📌 {room.topic}
              </span>
            )}
          </div>
        </div>
        <div className="nav-buttons">
          <button 
            className={`btn ${showHostControlPanel ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowHostControlPanel(!showHostControlPanel)}
          >
            🎯 主持控制台
          </button>
          <button 
            className={`btn ${hostView ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setHostView(!hostView)}
          >
            👁️ 主持视角
          </button>
          <button className="btn btn-secondary" onClick={() => openWindow('character')}>
            👤 角色
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

      <div className="room-main">
        <div className="room-canvas">
          <div className="grid-floor"></div>
          
          <div className="stage-area">
            <div className="host-display">
              <div className="seat host online">
                <div className="seat-avatar">👨‍💼</div>
                <div className="seat-name">主持人</div>
                <div style={{ 
                  position: 'absolute', 
                  top: '4px', 
                  left: '4px', 
                  fontSize: '10px', 
                  background: 'rgba(255, 189, 89, 0.9)',
                  color: '#333',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: '600',
                }}>
                  主持
                </div>
              </div>
            </div>
          </div>

          {room?.discussionMode && (
            <div style={{ 
              textAlign: 'center', 
              padding: '10px', 
              background: 'rgba(56, 239, 125, 0.15)',
              borderRadius: '10px',
              marginBottom: '20px',
              color: '#38ef7d',
              fontSize: '13px',
              fontWeight: '500',
            }}>
              💬 讨论模式已开启
            </div>
          )}

          {[0, 1, 2].map((rowIndex) => (
            <div key={rowIndex} className="seat-row" style={{ marginTop: rowIndex === 0 ? '20px' : '0' }}>
              {getSeatsInRow(rowIndex).map((seatNum) => {
                const participant = getParticipantAtSeat(seatNum);
                const groupDiscussing = participant ? isGroupDiscussionMode(participant.group) : false;
                
                if (participant) {
                  return (
                    <div
                      key={participant.id}
                      className={`seat ${participant.online ? 'online' : ''} ${participant.muted ? 'muted' : ''} ${dragOverSeat === seatNum ? 'drag-over' : ''} ${groupDiscussing ? 'discussion-mode' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, participant.id)}
                      onDragOver={(e) => handleDragOver(e, seatNum)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, seatNum)}
                      onDragEnd={handleDragEnd}
                      style={{
                        transform: draggedParticipant === participant.id ? 'scale(0.95)' : undefined,
                        opacity: draggedParticipant === participant.id ? 0.5 : 1,
                      }}
                    >
                      {participant.group && (
                        <div className={`group-label ${groupDiscussing ? 'discussion' : ''}`}>
                          {groupDiscussing ? '💬 ' : ''}{participant.group}
                        </div>
                      )}
                      {participant.role === 'cohost' && (
                        <div style={{ 
                          position: 'absolute', 
                          top: '4px', 
                          right: '4px', 
                          fontSize: '10px', 
                          background: 'rgba(102, 126, 234, 0.9)',
                          color: '#fff',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: '600',
                        }}>
                          联席
                        </div>
                      )}
                      <div className="seat-avatar">{participant.avatar}</div>
                      <div className="seat-name">{participant.name}</div>
                      <div className="seat-number" style={{ 
                        position: 'absolute', 
                        bottom: '4px', 
                        right: '8px', 
                        fontSize: '10px', 
                        color: 'rgba(255,255,255,0.5)',
                      }}>
                        #{seatNum}
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div 
                      key={`empty-${seatNum}`} 
                      className={`seat empty ${dragOverSeat === seatNum ? 'drag-over' : ''}`}
                      onDragOver={(e) => handleDragOver(e, seatNum)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, seatNum)}
                      style={{
                        border: dragOverSeat === seatNum ? '2px dashed #667eea' : '2px dashed rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                      }}
                    >
                      <div className="seat-avatar" style={{ opacity: 0.3 }}>👤</div>
                      <div className="seat-name" style={{ opacity: 0.3 }}>空座 {seatNum}</div>
                      <div style={{ 
                        position: 'absolute', 
                        bottom: '4px', 
                        right: '8px', 
                        fontSize: '10px', 
                        color: 'rgba(255,255,255,0.3)',
                      }}>
                        #{seatNum}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          ))}

          <div style={{ textAlign: 'center', marginTop: '30px', color: '#888', fontSize: '13px' }}>
            💡 拖拽参会者头像可以调整座位位置
          </div>
        </div>

        <div className="room-sidebar">
          <div className="sidebar-tabs">
            <div 
              className={`sidebar-tab ${activeTab === 'participants' ? 'active' : ''}`}
              onClick={() => setActiveTab('participants')}
            >
              参会者 ({onlineCount})
            </div>
            <div 
              className={`sidebar-tab ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveTab('groups')}
            >
              分组
            </div>
            <div 
              className={`sidebar-tab ${activeTab === 'host' ? 'active' : ''}`}
              onClick={() => setActiveTab('host')}
            >
              控制台
            </div>
          </div>

          <div className="sidebar-content">
            {activeTab === 'participants' && (
              <>
                <div className="quick-actions">
                  <button className="quick-action-btn" onClick={() => setShowInviteModal(true)}>
                    ➕ 邀请
                  </button>
                  <button className="quick-action-btn" onClick={handleMuteAll}>
                    🔇 全体静音
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div 
                    className={`filter-item ${selectedGroup === 'all' ? 'active' : ''}`}
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                    onClick={() => setSelectedGroup('all')}
                  >
                    全部 ({participants.length})
                  </div>
                  {groups.map(g => {
                    const count = getGroupMembers(g).length;
                    return (
                      <div
                        key={g}
                        className={`filter-item ${selectedGroup === g ? 'active' : ''}`}
                        style={{ padding: '4px 10px', fontSize: '11px' }}
                        onClick={() => setSelectedGroup(g)}
                      >
                        {g} ({count})
                      </div>
                    );
                  })}
                </div>

                <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                  {getFilteredParticipants().map(participant => (
                    <div 
                      key={participant.id} 
                      className={`participant-item ${participant.online ? 'online' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, participant.id)}
                      onDragEnd={handleDragEnd}
                      style={{ cursor: 'move' }}
                    >
                      <div className="avatar">{participant.avatar}</div>
                      <div className="info">
                        <div className="name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {participant.name}
                          {participant.role === 'cohost' && (
                            <span className={`role-badge ${getRoleBadgeClass(participant.role)}`}>
                              联席主持
                            </span>
                          )}
                        </div>
                        <div className="group">
                          {participant.group} · 座位{participant.seat} · {participant.online ? '在线' : '离线'}
                        </div>
                      </div>
                      <div className="actions">
                        <button 
                          className={`action-icon-btn ${participant.muted ? 'muted' : ''}`}
                          onClick={() => toggleMute(participant.id)}
                          title={participant.muted ? '取消静音' : '静音'}
                        >
                          {participant.muted ? '🔇' : '🔊'}
                        </button>
                        <button 
                          className="action-icon-btn"
                          onClick={() => toggleCohost(participant.id)}
                          title={participant.role === 'cohost' ? '取消联席主持' : '设为联席主持'}
                        >
                          {participant.role === 'cohost' ? '👑' : '🧑‍💼'}
                        </button>
                        <button 
                          className="action-icon-btn"
                          onClick={() => removeParticipant(participant.id)}
                          title="移除"
                        >
                          ✖️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'groups' && (
              <>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginBottom: '16px' }}
                  onClick={() => setShowGroupModal(true)}
                >
                  ⚙️ 管理分组
                </button>
                {groups.map(group => {
                  const groupMembers = getGroupMembers(group);
                  const isDiscussing = isGroupDiscussionMode(group);
                  const task = getGroupTask(group);
                  return (
                    <div key={group} className="card" style={{ marginBottom: '12px', padding: '14px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '10px',
                      }}>
                        <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isDiscussing && <span style={{ color: '#38ef7d' }}>💬</span>}
                          {group}
                        </strong>
                        <span style={{ fontSize: '12px', color: '#888' }}>
                          {groupMembers.length} 人
                        </span>
                      </div>
                      {task && (
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#ffb957',
                          background: 'rgba(255, 185, 87, 0.1)',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          marginBottom: '10px',
                        }}>
                          📋 任务：{task}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {groupMembers.map(m => (
                          <div 
                            key={m.id}
                            title={`${m.name}${m.role === 'cohost' ? '（联席主持）' : ''}`}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: m.online ? 'rgba(102, 126, 234, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                              border: m.role === 'cohost' ? '2px solid #ffb957' : m.online ? '1px solid #667eea' : 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              position: 'relative',
                            }}
                          >
                            {m.avatar}
                            {m.role === 'cohost' && (
                              <span style={{ 
                                position: 'absolute', 
                                top: '-4px', 
                                right: '-4px', 
                                fontSize: '10px' 
                              }}>👑</span>
                            )}
                          </div>
                        ))}
                        {groupMembers.length === 0 && (
                          <span style={{ fontSize: '12px', color: '#666' }}>暂无成员</span>
                        )}
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        gap: '6px', 
                        marginTop: '10px',
                      }}>
                        <button 
                          className={`btn ${isDiscussing ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1, fontSize: '11px', padding: '6px' }}
                          onClick={() => toggleDiscussionMode(group)}
                        >
                          {isDiscussing ? '关闭讨论' : '开启讨论'}
                        </button>
                        <button 
                          className="btn btn-secondary"
                          style={{ flex: 1, fontSize: '11px', padding: '6px' }}
                          onClick={() => {
                            setTaskGroup(group);
                            setTaskContent(task);
                            setShowTaskModal(true);
                          }}
                        >
                          发任务
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {activeTab === 'host' && (
              <div style={{ padding: '8px 0' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#ffb957' }}>🎮 快捷操作</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button 
                      className="btn btn-secondary"
                      style={{ padding: '12px 8px', fontSize: '12px' }}
                      onClick={handleMuteAll}
                    >
                      🔇 全体静音
                    </button>
                    <button 
                      className="btn btn-secondary"
                      style={{ padding: '12px 8px', fontSize: '12px' }}
                      onClick={() => openWindow('whiteboard')}
                    >
                      📝 打开白板
                    </button>
                    <button 
                      className="btn btn-secondary"
                      style={{ padding: '12px 8px', fontSize: '12px' }}
                      onClick={() => openWindow('activity')}
                    >
                      ✋ 发起举手
                    </button>
                    <button 
                      className="btn btn-secondary"
                      style={{ padding: '12px 8px', fontSize: '12px' }}
                      onClick={() => openWindow('recording')}
                    >
                      ⏺️ 开始录制
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#667eea' }}>💬 讨论模式</h3>
                  {groups.map(group => {
                    const isDiscussing = isGroupDiscussionMode(group);
                    return (
                      <div 
                        key={group}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 12px',
                          background: isDiscussing ? 'rgba(56, 239, 125, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          marginBottom: '6px',
                          border: isDiscussing ? '1px solid rgba(56, 239, 125, 0.3)' : 'none',
                        }}
                      >
                        <span style={{ fontSize: '13px' }}>
                          {isDiscussing ? '💬 ' : ''}{group}
                        </span>
                        <button 
                          className={`btn ${isDiscussing ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                          onClick={() => toggleDiscussionMode(group)}
                        >
                          {isDiscussing ? '关闭' : '开启'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#38ef7d' }}>📋 分组任务</h3>
                  <div style={{ marginBottom: '10px' }}>
                    <select 
                      value={taskGroup}
                      onChange={(e) => setTaskGroup(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '13px',
                        marginBottom: '8px',
                      }}
                    >
                      {groups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <textarea
                      placeholder="输入要下发的任务内容..."
                      value={taskContent}
                      onChange={(e) => setTaskContent(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '13px',
                        resize: 'vertical',
                        minHeight: '60px',
                        marginBottom: '8px',
                      }}
                    />
                    <button 
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: '12px' }}
                      onClick={sendGroupTask}
                    >
                      发送任务
                    </button>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: '14px', marginBottom: '12px', color: '#f5576c' }}>👑 联席主持 ({cohosts.length})</h3>
                  {cohosts.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', padding: '20px' }}>
                      暂无联席主持人
                    </div>
                  ) : (
                    cohosts.map(cohost => (
                      <div 
                        key={cohost.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'rgba(255, 185, 87, 0.1)',
                          borderRadius: '8px',
                          marginBottom: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>{cohost.avatar}</span>
                          <span style={{ fontSize: '13px' }}>{cohost.name}</span>
                        </div>
                        <button 
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          onClick={() => toggleCohost(cohost.id)}
                        >
                          取消
                        </button>
                      </div>
                    ))
                  )}
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#666', 
                    marginTop: '8px',
                    lineHeight: '1.5',
                  }}>
                    💡 在「参会者」列表中点击 👑 图标可设为联席主持
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="room-toolbar">
        <button 
          className={`tool-btn ${!isMicOn ? 'active' : ''}`}
          onClick={toggleMic}
        >
          <span className="icon">{isMicOn ? '🎤' : '🔇'}</span>
          <span className="label">{isMicOn ? '麦克风' : '已静音'}</span>
        </button>
        
        <button 
          className={`tool-btn ${!isCameraOn ? 'active' : ''}`}
          onClick={toggleCamera}
        >
          <span className="icon">{isCameraOn ? '📹' : '🚫'}</span>
          <span className="label">{isCameraOn ? '摄像头' : '已关闭'}</span>
        </button>
        
        <button 
          className={`tool-btn ${isScreenSharing ? 'active' : ''}`}
          onClick={toggleScreenShare}
        >
          <span className="icon">🖥️</span>
          <span className="label">共享屏幕</span>
        </button>
        
        <button className="tool-btn" onClick={() => openWindow('whiteboard')}>
          <span className="icon">📝</span>
          <span className="label">白板</span>
        </button>
        
        <button className="tool-btn" onClick={() => openWindow('activity')}>
          <span className="icon">✋</span>
          <span className="label">举手</span>
        </button>
        
        <button className="tool-btn" onClick={() => openWindow('recording')}>
          <span className="icon">⏺️</span>
          <span className="label">录制</span>
        </button>
        
        <button className="tool-btn danger">
          <span className="icon">📞</span>
          <span className="label">离开</span>
        </button>
      </div>

      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>邀请参会者</h2>
            <div className="form-group">
              <label>姓名或邮箱</label>
              <input 
                type="text"
                placeholder="输入姓名或邮箱"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>分配分组</label>
              <select 
                value={inviteGroup}
                onChange={e => setInviteGroup(e.target.value)}
              >
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>角色</label>
              <select
                value={inviteGroup}
                onChange={e => setInviteGroup(e.target.value)}
              >
                <option value="participant">参会者</option>
                <option value="cohost">联席主持人</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowInviteModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={inviteParticipant}>发送邀请</button>
            </div>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>发送分组任务</h2>
            <div className="form-group">
              <label>目标分组</label>
              <select 
                value={taskGroup}
                onChange={e => setTaskGroup(e.target.value)}
              >
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>任务内容</label>
              <textarea
                placeholder="请输入任务内容..."
                value={taskContent}
                onChange={e => setTaskContent(e.target.value)}
                style={{ minHeight: '100px', resize: 'vertical' }}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={sendGroupTask}>发送任务</button>
            </div>
          </div>
        </div>
      )}

      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>分组管理</h2>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>
              点击成员下方的下拉菜单可移动到其他分组
            </p>
            {groups.map(group => {
              const groupMembers = getGroupMembers(group);
              const otherGroups = groups.filter(g => g !== group);
              const isDiscussing = isGroupDiscussionMode(group);
              const task = getGroupTask(group);
              
              return (
                <div key={group} style={{ marginBottom: '20px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isDiscussing && <span>💬</span>}
                      {group}
                    </span>
                    <span style={{ color: '#888', fontSize: '12px' }}>{groupMembers.length}人</span>
                  </div>
                  {task && (
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#ffb957',
                      background: 'rgba(255, 185, 87, 0.1)',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      marginBottom: '8px',
                    }}>
                      📋 任务：{task}
                    </div>
                  )}
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    flexWrap: 'wrap',
                    padding: '12px',
                    background: isDiscussing ? 'rgba(56, 239, 125, 0.05)' : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    minHeight: '50px',
                    border: isDiscussing ? '1px solid rgba(56, 239, 125, 0.2)' : 'none',
                  }}>
                    {groupMembers.map(m => (
                      <div key={m.id} style={{ position: 'relative' }}>
                        <div 
                          style={{
                            padding: '6px 12px',
                            background: m.role === 'cohost' ? 'rgba(255, 185, 87, 0.2)' : 'rgba(102, 126, 234, 0.2)',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            border: m.role === 'cohost' ? '1px solid rgba(255, 185, 87, 0.5)' : 'none',
                          }}
                          title={`${m.name}${m.role === 'cohost' ? '（联席主持）' : ''}`}
                        >
                          {m.avatar} {m.name}
                          {m.role === 'cohost' && <span>👑</span>}
                        </div>
                        <select
                          style={{
                            position: 'absolute',
                            bottom: '-28px',
                            left: '0',
                            fontSize: '10px',
                            background: 'rgba(0,0,0,0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 4px',
                            zIndex: 10,
                          }}
                          onChange={(e) => {
                            if (e.target.value) {
                              handleMoveToGroup(m.id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="">移动到...</option>
                          {otherGroups.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                    {groupMembers.length === 0 && (
                      <span style={{ fontSize: '12px', color: '#666' }}>暂无成员</span>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => setShowGroupModal(false)}>
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomApp;
