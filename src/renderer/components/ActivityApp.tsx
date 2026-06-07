import React, { useState } from 'react';
import { useActivities, storeActions } from '../hooks/useStore';

const ActivityApp: React.FC = () => {
  const activities = useActivities();
  const [activeTab, setActiveTab] = useState('handraise');
  const [showCreateVote, setShowCreateVote] = useState(false);
  const [newVoteQuestion, setNewVoteQuestion] = useState('');
  const [newVoteOptions, setNewVoteOptions] = useState(['', '']);

  const admitHand = (id: string) => {
    storeActions.admitHandRaise(id);
  };

  const rejectHand = (id: string) => {
    storeActions.rejectHandRaise(id);
  };

  const addVoteOption = () => {
    if (newVoteOptions.length < 6) {
      setNewVoteOptions([...newVoteOptions, '']);
    }
  };

  const removeVoteOption = (index: number) => {
    if (newVoteOptions.length > 2) {
      setNewVoteOptions(newVoteOptions.filter((_, i) => i !== index));
    }
  };

  const updateVoteOption = (index: number, value: string) => {
    const updated = [...newVoteOptions];
    updated[index] = value;
    setNewVoteOptions(updated);
  };

  const createVote = () => {
    if (!newVoteQuestion.trim() || newVoteOptions.filter(o => o.trim()).length < 2) return;
    
    const validOptions = newVoteOptions.filter(o => o.trim());
    storeActions.addVote({
      question: newVoteQuestion,
      options: validOptions,
    });
    setShowCreateVote(false);
    setNewVoteQuestion('');
    setNewVoteOptions(['', '']);
  };

  const toggleVote = (id: string) => {
    storeActions.toggleVoteActive(id);
  };

  const totalVotes = (results: number[]) => results.reduce((sum, r) => sum + r, 0);

  const navItems = [
    { id: 'handraise', icon: '✋', name: '举手发言' },
    { id: 'vote', icon: '🗳️', name: '投票管理' },
    { id: 'task', icon: '🎮', name: '闯关任务' },
  ];

  return (
    <div className="activity-container">
      <header className="header">
        <h1>🎮 活动中心</h1>
        <div className="nav-buttons">
          <button className="btn btn-secondary" onClick={() => storeActions.openWindow('room')}>
            🏠 房间
          </button>
        </div>
      </header>

      <div className="activity-main">
        <div className="activity-sidebar">
          {navItems.map(item => (
            <div
              key={item.id}
              className={`activity-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.name}</span>
            </div>
          ))}
        </div>

        <div className="activity-content">
          {activeTab === 'handraise' && (
            <div>
              <div className="hand-raise-section">
                <div className="hand-raise-header">
                  <h2>✋ 举手发言</h2>
                  <span className="status-badge status-warning">
                    {activities.handRaises.length} 人等待
                  </span>
                </div>

                {activities.handRaises.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">🙋</div>
                    <p>暂无举手申请</p>
                  </div>
                ) : (
                  <div className="hand-raise-list">
                    {activities.handRaises.map(hand => (
                      <div key={hand.id} className="hand-raise-item">
                        <div className="avatar">{hand.avatar}</div>
                        <div className="info">
                          <div className="name">{hand.name}</div>
                          <div className="time">举手时间：{hand.time}</div>
                        </div>
                        <div className="actions">
                          <button 
                            className="btn btn-success"
                            style={{ padding: '6px 14px', fontSize: '13px' }}
                            onClick={() => admitHand(hand.id)}
                          >
                            ✔️ 允许发言
                          </button>
                          <button 
                            className="btn btn-secondary"
                            style={{ padding: '6px 14px', fontSize: '13px' }}
                            onClick={() => rejectHand(hand.id)}
                          >
                            ✖️ 忽略
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card" style={{ marginTop: '20px' }}>
                <h3 style={{ marginBottom: '12px' }}>💡 快捷操作</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary">🔊 邀请全体发言</button>
                  <button className="btn btn-secondary">🔇 全员静音</button>
                  <button className="btn btn-secondary">⏱️ 设置发言时限</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vote' && (
            <div>
              <div className="vote-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2>🗳️ 投票管理</h2>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowCreateVote(true)}
                  >
                    ➕ 创建投票
                  </button>
                </div>

                {activities.votes.map(vote => {
                  const total = totalVotes(vote.results);
                  return (
                    <div key={vote.id} className="vote-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                        <h3 style={{ marginBottom: 0 }}>{vote.question}</h3>
                        <span className={`status-badge ${vote.active ? 'status-active' : 'status-inactive'}`}>
                          {vote.active ? '进行中' : '已结束'}
                        </span>
                      </div>

                      {vote.options.map((option, idx) => {
                        const percentage = total > 0 ? (vote.results[idx] / total * 100).toFixed(0) : 0;
                        return (
                          <div key={idx} className="vote-option">
                            <div className="option-text">{option}</div>
                            <div className="bar-container">
                              <div className="bar-fill" style={{ width: `${percentage}%` }}></div>
                            </div>
                            <div className="option-count">{vote.results[idx]}票 ({percentage}%)</div>
                          </div>
                        );
                      })}

                      <div className="vote-status">
                        <span>共 {total} 人参与投票</span>
                        <button 
                          className={`btn ${vote.active ? 'btn-danger' : 'btn-success'}`}
                          style={{ padding: '6px 14px', fontSize: '12px', marginLeft: 'auto' }}
                          onClick={() => toggleVote(vote.id)}
                        >
                          {vote.active ? '⏹️ 结束投票' : '▶️ 重新开始'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'task' && (
            <div>
              <h2>🎮 闯关任务</h2>
              <p style={{ color: '#888', marginBottom: '20px' }}>
                设计闯关任务，增加培训趣味性，激励学员主动参与
              </p>

              <div className="task-list">
                {activities.tasks.map(task => (
                  <div key={task.id} className={`task-item ${task.status}`}>
                    <div className="task-icon">
                      {task.status === 'completed' ? '✅' : task.status === 'active' ? '🎯' : '🔒'}
                    </div>
                    <div className="task-info">
                      <div className="task-name">{task.name}</div>
                      <div className="task-reward">{task.reward}</div>
                    </div>
                    <div className={`task-status-badge ${task.status}`}>
                      {task.status === 'completed' ? '已完成' : task.status === 'active' ? '进行中' : '未解锁'}
                    </div>
                  </div>
                ))}
              </div>

              <button 
                className="btn btn-primary" 
                style={{ marginTop: '20px', width: '100%' }}
              >
                ➕ 添加新关卡
              </button>

              <div className="card" style={{ marginTop: '24px' }}>
                <h3 style={{ marginBottom: '12px' }}>📊 完成情况统计</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38ef7d' }}>15</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>已完成第一关</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#667eea' }}>8</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>正在闯关</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f5b342' }}>0</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>全部通关</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreateVote && (
        <div className="modal-overlay" onClick={() => setShowCreateVote(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>创建投票</h2>
            
            <div className="form-group">
              <label>投票问题</label>
              <input 
                type="text"
                placeholder="请输入投票问题"
                value={newVoteQuestion}
                onChange={e => setNewVoteQuestion(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>投票选项</label>
              {newVoteOptions.map((option, idx) => (
                <div key={idx} className="option-input-row">
                  <input
                    type="text"
                    placeholder={`选项 ${idx + 1}`}
                    value={option}
                    onChange={e => updateVoteOption(idx, e.target.value)}
                  />
                  {newVoteOptions.length > 2 && (
                    <button 
                      className="btn btn-secondary"
                      style={{ padding: '8px 12px' }}
                      onClick={() => removeVoteOption(idx)}
                    >
                      ✖️
                    </button>
                  )}
                </div>
              ))}
              {newVoteOptions.length < 6 && (
                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', marginTop: '8px' }}
                  onClick={addVoteOption}
                >
                  ➕ 添加选项
                </button>
              )}
            </div>

            <div className="form-group">
              <label>投票设置</label>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <input type="checkbox" /> 匿名投票
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                  <input type="checkbox" defaultChecked /> 实时显示结果
                </label>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCreateVote(false)}>取消</button>
              <button className="btn btn-primary" onClick={createVote}>发起投票</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityApp;
