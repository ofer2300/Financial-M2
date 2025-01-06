import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';

interface WhiteBoardProps {
  roomId: string;
  userId: string;
  onError: (error: Error) => void;
}

interface DrawingObject {
  type: string;
  options: any;
}

export function WhiteBoard({ roomId, userId, onError }: WhiteBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [currentTool, setCurrentTool] = useState<'pencil' | 'rect' | 'circle' | 'text'>('pencil');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);

  useEffect(() => {
    if (canvasRef.current) {
      // יצירת canvas של Fabric.js
      fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
        isDrawingMode: true,
        width: window.innerWidth * 0.8,
        height: window.innerHeight * 0.8,
        backgroundColor: '#ffffff',
      });

      // הגדרת מברשת ציור
      const freeDrawingBrush = fabricCanvasRef.current.freeDrawingBrush;
      freeDrawingBrush.color = currentColor;
      freeDrawingBrush.width = brushSize;

      // מאזין לשינויי גודל חלון
      const handleResize = () => {
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.setDimensions({
            width: window.innerWidth * 0.8,
            height: window.innerHeight * 0.8,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      // מאזין לשינויים בקנבס
      fabricCanvasRef.current.on('object:added', (e: fabric.IEvent<Event>) => {
        const target = e.target as fabric.Object;
        if (target) {
          const object = target.toObject();
          broadcastDrawing({
            type: 'add',
            options: object,
          });
        }
      });

      fabricCanvasRef.current.on('object:modified', (e: fabric.IEvent<Event>) => {
        const target = e.target as fabric.Object;
        if (target) {
          const object = target.toObject();
          broadcastDrawing({
            type: 'modify',
            options: object,
          });
        }
      });

      return () => {
        window.removeEventListener('resize', handleResize);
        if (fabricCanvasRef.current) {
          fabricCanvasRef.current.dispose();
        }
      };
    }
  }, []);

  useEffect(() => {
    if (fabricCanvasRef.current) {
      const canvas = fabricCanvasRef.current;
      canvas.isDrawingMode = currentTool === 'pencil';
      canvas.freeDrawingBrush.color = currentColor;
      canvas.freeDrawingBrush.width = brushSize;
    }
  }, [currentTool, currentColor, brushSize]);

  const addShape = (type: 'rect' | 'circle') => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    let shape;

    if (type === 'rect') {
      shape = new fabric.Rect({
        left: 100,
        top: 100,
        fill: currentColor,
        width: 100,
        height: 100,
      });
    } else if (type === 'circle') {
      shape = new fabric.Circle({
        left: 100,
        top: 100,
        fill: currentColor,
        radius: 50,
      });
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
    }
  };

  const addText = () => {
    if (!fabricCanvasRef.current) return;

    const text = new fabric.IText('הקלד טקסט', {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fill: currentColor,
      fontSize: 20,
    });

    fabricCanvasRef.current.add(text);
    fabricCanvasRef.current.setActiveObject(text);
    fabricCanvasRef.current.renderAll();
  };

  const clear = () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.setBackgroundColor('#ffffff', () => {
        fabricCanvasRef.current?.renderAll();
      });
      broadcastDrawing({ type: 'clear', options: {} });
    }
  };

  const broadcastDrawing = (drawing: DrawingObject) => {
    // כאן צריך להוסיף את הלוגיקה לשליחת השינויים לשאר המשתתפים
    // לדוגמה באמצעות WebSocket או RTCDataChannel
    console.log('Broadcasting drawing:', drawing);
  };

  return (
    <div className="whiteboard">
      <div className="toolbar">
        <div className="tool-group">
          <button
            onClick={() => setCurrentTool('pencil')}
            className={`tool-button ${currentTool === 'pencil' ? 'active' : ''}`}
          >
            עיפרון
          </button>
          <button
            onClick={() => addShape('rect')}
            className={`tool-button ${currentTool === 'rect' ? 'active' : ''}`}
          >
            מרובע
          </button>
          <button
            onClick={() => addShape('circle')}
            className={`tool-button ${currentTool === 'circle' ? 'active' : ''}`}
          >
            עיגול
          </button>
          <button
            onClick={() => addText()}
            className={`tool-button ${currentTool === 'text' ? 'active' : ''}`}
          >
            טקסט
          </button>
        </div>

        <div className="tool-group">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="color-picker"
          />
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="brush-size"
          />
        </div>

        <button onClick={clear} className="clear-button">
          נקה הכל
        </button>
      </div>

      <div className="canvas-container">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

// סגנונות CSS
const styles = `
.whiteboard {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background-color: #f3f4f6;
  border-radius: 0.5rem;
}

.toolbar {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  background-color: white;
  border-radius: 0.25rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.tool-group {
  display: flex;
  gap: 0.5rem;
  padding: 0.25rem;
  border-right: 1px solid #e5e7eb;
}

.tool-group:last-child {
  border-right: none;
}

.tool-button {
  padding: 0.5rem;
  border: none;
  border-radius: 0.25rem;
  background-color: #f3f4f6;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-button:hover {
  background-color: #e5e7eb;
}

.tool-button.active {
  background-color: #2563eb;
  color: white;
}

.color-picker {
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
}

.brush-size {
  width: 100px;
}

.clear-button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.25rem;
  background-color: #dc2626;
  color: white;
  cursor: pointer;
  transition: background-color 0.2s;
}

.clear-button:hover {
  background-color: #b91c1c;
}

.canvas-container {
  position: relative;
  width: 80vw;
  height: 80vh;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

canvas {
  position: absolute;
  top: 0;
  left: 0;
}
`;

// הוספת הסגנונות לדף
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet); 