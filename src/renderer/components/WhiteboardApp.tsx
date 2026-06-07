import React, { useState, useRef, useEffect, useCallback } from 'react';
import { storeActions } from '../hooks/useStore';

interface DrawAction {
  type: string;
  color: string;
  size: number;
  points?: { x: number; y: number }[];
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  text?: string;
  x?: number;
  y?: number;
}

const WhiteboardApp: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState('pen');
  const [currentColor, setCurrentColor] = useState('#1a1a2e');
  const [brushSize, setBrushSize] = useState(4);
  const [zoom, setZoom] = useState(100);
  
  const [history, setHistory] = useState<DrawAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [tempAction, setTempAction] = useState<DrawAction | null>(null);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [textValue, setTextValue] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);

  const tools = [
    { id: 'pen', icon: '✏️', name: '画笔' },
    { id: 'eraser', icon: '🧹', name: '橡皮擦' },
    { id: 'text', icon: '📝', name: '文字' },
    { id: 'line', icon: '📏', name: '直线' },
    { id: 'rect', icon: '⬜', name: '矩形' },
    { id: 'circle', icon: '⭕', name: '圆形' },
  ];

  const colors = [
    '#1a1a2e', '#e94560', '#ff6b6b', '#feca57',
    '#48dbfb', '#1dd1a1', '#5f27cd', '#ff9ff3',
  ];

  const files = [
    { id: 'f1', name: '产品介绍图.png', size: '2.3 MB', type: 'image' as const, icon: '🖼️' },
    { id: 'f2', name: '培训大纲.pdf', size: '1.8 MB', type: 'file' as const, icon: '📄' },
  ];

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i <= historyIndex; i++) {
      const action = history[i];
      drawAction(ctx, action);
    }

    if (tempAction) {
      drawAction(ctx, tempAction);
    }
  }, [history, historyIndex, tempAction]);

  useEffect(() => {
    redrawCanvas();
  }, [history, historyIndex, tempAction, redrawCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (canvas && container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redrawCanvas();
    }

    const handleResize = () => {
      if (canvas && container) {
        const imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height);
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        redrawCanvas();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  const drawAction = (ctx: CanvasRenderingContext2D, action: DrawAction) => {
    ctx.strokeStyle = action.type === 'eraser' ? '#f5f5f5' : action.color;
    ctx.fillStyle = action.color;
    ctx.lineWidth = action.type === 'eraser' ? action.size * 4 : action.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (action.type) {
      case 'pen':
      case 'eraser':
        if (action.points && action.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(action.points[0].x, action.points[0].y);
          for (let i = 1; i < action.points.length; i++) {
            ctx.lineTo(action.points[i].x, action.points[i].y);
          }
          ctx.stroke();
        }
        break;

      case 'line':
        if (action.startX !== undefined && action.endX !== undefined) {
          ctx.beginPath();
          ctx.moveTo(action.startX, action.startY!);
          ctx.lineTo(action.endX, action.endY!);
          ctx.stroke();
        }
        break;

      case 'rect':
        if (action.startX !== undefined && action.endX !== undefined) {
          ctx.strokeRect(
            action.startX,
            action.startY!,
            action.endX - action.startX,
            action.endY! - action.startY!
          );
        }
        break;

      case 'circle':
        if (action.startX !== undefined && action.endX !== undefined) {
          const radiusX = Math.abs(action.endX - action.startX) / 2;
          const radiusY = Math.abs(action.endY! - action.startY!) / 2;
          const centerX = action.startX + (action.endX - action.startX) / 2;
          const centerY = action.startY! + (action.endY! - action.startY!) / 2;
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;

      case 'text':
        if (action.text && action.x !== undefined) {
          ctx.font = `${action.size * 4}px Arial, sans-serif`;
          ctx.fillText(action.text, action.x, action.y!);
        }
        break;
    }
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);

    if (currentTool === 'text') {
      setTextPosition(coords);
      setShowTextInput(true);
      setTextValue('');
      setTimeout(() => textInputRef.current?.focus(), 10);
      return;
    }

    setIsDrawing(true);
    setStartPoint(coords);

    if (currentTool === 'pen' || currentTool === 'eraser') {
      setCurrentPath([coords]);
    }
  };

  const drawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentTool === 'text') return;
    
    const coords = getCanvasCoords(e);

    if (currentTool === 'pen' || currentTool === 'eraser') {
      setCurrentPath(prev => [...prev, coords]);
      const tempAction: DrawAction = {
        type: currentTool,
        color: currentColor,
        size: brushSize,
        points: [...currentPath, coords],
      };
      setTempAction(tempAction);
    } else if (startPoint) {
      const tempAction: DrawAction = {
        type: currentTool,
        color: currentColor,
        size: brushSize,
        startX: startPoint.x,
        startY: startPoint.y,
        endX: coords.x,
        endY: coords.y,
      };
      setTempAction(tempAction);
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentTool === 'text') return;

    const coords = getCanvasCoords(e);
    let newAction: DrawAction;

    if (currentTool === 'pen' || currentTool === 'eraser') {
      newAction = {
        type: currentTool,
        color: currentColor,
        size: brushSize,
        points: currentPath,
      };
    } else {
      newAction = {
        type: currentTool,
        color: currentColor,
        size: brushSize,
        startX: startPoint?.x,
        startY: startPoint?.y,
        endX: coords.x,
        endY: coords.y,
      };
    }

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAction);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setTempAction(null);
    setCurrentPath([]);
    setStartPoint(null);
  };

  const handleTextSubmit = () => {
    if (!textValue.trim()) {
      setShowTextInput(false);
      return;
    }

    const newAction: DrawAction = {
      type: 'text',
      color: currentColor,
      size: brushSize,
      text: textValue,
      x: textPosition.x,
      y: textPosition.y + brushSize * 4,
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAction);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setShowTextInput(false);
    setTextValue('');
  };

  const undo = () => {
    if (historyIndex > -1) {
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  };

  const clearCanvas = () => {
    setHistory([]);
    setHistoryIndex(-1);
    setTempAction(null);
  };

  const saveWhiteboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const result = await storeActions.showSaveDialog({
      defaultPath: 'whiteboard.png',
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });

    if (!result.canceled && result.filePath) {
      const dataUrl = canvas.toDataURL('image/png');
      await storeActions.exportWhiteboardPNG(result.filePath, dataUrl);
    }
  };

  const handleUpload = async () => {
    const result = await storeActions.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] },
        { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'xlsx', 'ppt'] },
      ],
    });
  };

  const openWindow = (name: string) => {
    storeActions.openWindow(name);
  };

  return (
    <div className="whiteboard-container">
      <header className="header">
        <h1>📝 协作白板</h1>
        <div className="nav-buttons">
          <button className="btn btn-secondary" onClick={() => openWindow('room')}>
            🏠 房间
          </button>
          <button className="btn btn-secondary" onClick={undo} disabled={historyIndex < 0}>
            ↩️ 撤销
          </button>
          <button className="btn btn-secondary" onClick={redo} disabled={historyIndex >= history.length - 1}>
            ↪️ 重做
          </button>
          <button className="btn btn-secondary" onClick={clearCanvas}>
            🗑️ 清空
          </button>
          <button className="btn btn-primary" onClick={saveWhiteboard}>
            💾 保存
          </button>
        </div>
      </header>

      <div className="whiteboard-main">
        <div className="whiteboard-sidebar">
          {tools.map(tool => (
            <button
              key={tool.id}
              className={`tool-btn-wb ${currentTool === tool.id ? 'active' : ''}`}
              onClick={() => setCurrentTool(tool.id)}
              title={tool.name}
            >
              {tool.icon}
            </button>
          ))}
          
          <div className="tool-divider"></div>
          
          <div className="color-picker-wb">
            {colors.map(color => (
              <div
                key={color}
                className={`color-dot ${currentColor === color && currentTool !== 'eraser' ? 'active' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => { setCurrentColor(color); if (currentTool === 'eraser') setCurrentTool('pen'); }}
              />
            ))}
          </div>

          <div className="tool-divider"></div>

          <button 
            className="tool-btn-wb"
            onClick={() => setBrushSize(Math.max(1, brushSize - 1))}
            title="减小笔触"
          >
            ➖
          </button>
          <div className="size-slider" title="笔触大小">
            <div 
              className="size-dot" 
              style={{ width: brushSize, height: brushSize, backgroundColor: currentColor }}
            ></div>
          </div>
          <button 
            className="tool-btn-wb"
            onClick={() => setBrushSize(Math.min(20, brushSize + 1))}
            title="增大笔触"
          >
            ➕
          </button>

          <div className="tool-divider"></div>

          <button 
            className="tool-btn-wb" 
            onClick={undo} 
            title="撤销"
            disabled={historyIndex < 0}
            style={{ opacity: historyIndex < 0 ? 0.5 : 1 }}
          >
            ↩️
          </button>
          <button 
            className="tool-btn-wb" 
            onClick={redo} 
            title="重做"
            disabled={historyIndex >= history.length - 1}
            style={{ opacity: historyIndex >= history.length - 1 ? 0.5 : 1 }}
          >
            ↪️
          </button>
        </div>

        <div className="whiteboard-canvas-area" ref={containerRef}>
          <div className="whiteboard-bg"></div>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={drawing}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{ cursor: currentTool === 'text' ? 'text' : 'crosshair' }}
          />
          
          {showTextInput && (
            <div
              style={{
                position: 'absolute',
                left: textPosition.x,
                top: textPosition.y,
                zIndex: 100,
              }}
            >
              <input
                ref={textInputRef}
                type="text"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onBlur={handleTextSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTextSubmit();
                  if (e.key === 'Escape') setShowTextInput(false);
                }}
                placeholder="输入文字..."
                style={{
                  fontSize: `${brushSize * 4}px`,
                  color: currentColor,
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: `2px solid ${currentColor}`,
                  borderRadius: '4px',
                  padding: '4px 8px',
                  outline: 'none',
                  fontFamily: 'Arial, sans-serif',
                }}
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="whiteboard-right">
          <h3>📎 共享文件</h3>
          
          <div className="upload-area" onClick={handleUpload}>
            <div className="icon">📤</div>
            <p>点击上传图片或文件</p>
          </div>

          <div className="files-section">
            {files.map(file => (
              <div key={file.id} className="file-item">
                <div className="icon">{file.icon}</div>
                <div className="info">
                  <div className="filename">{file.name}</div>
                  <div className="size">{file.size}</div>
                </div>
                <button className="action-icon-btn" title="在白板中打开">
                  👁️
                </button>
              </div>
            ))}
          </div>

          <h3 style={{ marginTop: '24px' }}>📚 图层</h3>
          <div className="layer-item active">
            <span className="name">图层 1</span>
            <div className="actions">
              <button className="action-icon-btn">👁️</button>
              <button className="action-icon-btn">🔒</button>
            </div>
          </div>
          <div className="layer-item">
            <span className="name">背景</span>
            <div className="actions">
              <button className="action-icon-btn">👁️</button>
              <button className="action-icon-btn">🔓</button>
            </div>
          </div>

          <button className="btn btn-secondary" style={{ width: '100%', marginTop: '16px' }}>
            ➕ 添加图层
          </button>
        </div>
      </div>

      <div className="whiteboard-footer">
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={() => setZoom(Math.max(25, zoom - 25))}>➖</button>
          <div className="zoom-level">{zoom}%</div>
          <button className="zoom-btn" onClick={() => setZoom(Math.min(200, zoom + 25))}>➕</button>
        </div>
        <div className="page-info">
          当前工具: {tools.find(t => t.id === currentTool)?.name} | 
          颜色: 
          <span style={{ 
            display: 'inline-block', 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            backgroundColor: currentColor,
            marginLeft: '6px',
            verticalAlign: 'middle',
          }}></span>
          {' '}| 笔触: {brushSize}px
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>
            👥 3人协作中
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhiteboardApp;
