import { useCallback, useEffect, useRef, useState } from "react";
import { Layer, Line, Rect, Stage, Text, Transformer } from "react-konva";
import Konva from "konva";
import { v4 as uuidv4 } from "uuid";
import type { CoverShape, EditorShape, TextShape } from "@/types/editor";
import { useEditorStore } from "@/stores/editorStore";

const SNAP_PX = 6;

function boxOfNode(n: Konva.Node) {
  const r = n.getClientRect({ skipShadow: true, skipStroke: true });
  return {
    l: r.x,
    r: r.x + r.width,
    t: r.y,
    b: r.y + r.height,
    cx: r.x + r.width / 2,
    cy: r.y + r.height / 2,
  };
}

interface KonvaOverlayProps {
  width: number;
  height: number;
  shapes: EditorShape[];
  commit: (next: EditorShape[]) => void;
}

export function KonvaOverlay({
  width,
  height,
  shapes,
  commit,
}: KonvaOverlayProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const toolMode = useEditorStore((s) => s.toolMode);
  const setToolMode = useEditorStore((s) => s.setToolMode);
  const snapGrid = useEditorStore((s) => s.snapGrid);
  const snapGuides = useEditorStore((s) => s.snapGuides);
  const gridSize = useEditorStore((s) => s.gridSize);
  const lastPickedColor = useEditorStore((s) => s.lastPickedColor);
  const selectedId = useEditorStore((s) => s.selectedShapeId);
  const setSelectedId = useEditorStore((s) => s.setSelectedShapeId);

  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({
    v: [],
    h: [],
  });
  const [draftCover, setDraftCover] = useState<{
    sx: number;
    sy: number;
    cx: number;
    cy: number;
  } | null>(null);

  const selectedShape = shapes.find((s) => s.id === selectedId) ?? null;
  const showTransformer =
    selectedShape &&
    !selectedShape.locked &&
    toolMode === "select" &&
    (selectedShape.type === "text" || selectedShape.type === "cover");

  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    if (!showTransformer || !selectedId) {
      tr.nodes([]);
      return;
    }
    const node = stage.findOne("#" + selectedId);
    if (node) tr.nodes([node]);
    else tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [shapes, selectedId, showTransformer]);

  const applySnapGrid = useCallback(
    (x: number, y: number) => {
      if (!snapGrid) return { x, y };
      const g = gridSize;
      return {
        x: Math.round(x / g) * g,
        y: Math.round(y / g) * g,
      };
    },
    [snapGrid, gridSize]
  );

  const snapNodeToGuides = useCallback(
    (node: Konva.Node, pageW: number, pageH: number) => {
      if (!snapGuides) {
        setGuides({ v: [], h: [] });
        return;
      }
      const me = boxOfNode(node);
      const stopsV = [0, pageW / 2, pageW];
      const stopsH = [0, pageH / 2, pageH];
      for (const s of shapes) {
        if (s.id === selectedId) continue;
        const el = stageRef.current?.findOne("#" + s.id);
        if (!el) continue;
        const b = boxOfNode(el);
        stopsV.push(b.l, b.cx, b.r);
        stopsH.push(b.t, b.cy, b.b);
      }
      let bestVx = SNAP_PX + 1;
      let dx = 0;
      let gv: number[] = [];
      for (const vx of stopsV) {
        for (const pt of [me.l, me.cx, me.r]) {
          const ad = Math.abs(vx - pt);
          if (ad < bestVx) {
            bestVx = ad;
            dx = vx - pt;
            gv = [vx];
          }
        }
      }
      let bestHy = SNAP_PX + 1;
      let dy = 0;
      let gh: number[] = [];
      for (const hy of stopsH) {
        for (const pt of [me.t, me.cy, me.b]) {
          const ad = Math.abs(hy - pt);
          if (ad < bestHy) {
            bestHy = ad;
            dy = hy - pt;
            gh = [hy];
          }
        }
      }
      if (bestVx <= SNAP_PX) node.x(node.x() + dx);
      if (bestHy <= SNAP_PX) node.y(node.y() + dy);
      setGuides({
        v: bestVx <= SNAP_PX ? gv : [],
        h: bestHy <= SNAP_PX ? gh : [],
      });
    },
    [snapGuides, shapes, selectedId]
  );

  const bakeTextTransform = useCallback((node: Konva.Text) => {
    const sx = node.scaleX();
    const sy = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    const fs = Math.max(6, node.fontSize() * sy);
    const w = Math.max(24, node.width() * sx);
    node.fontSize(fs);
    node.width(w);
  }, []);

  const bakeRectTransform = useCallback((node: Konva.Rect) => {
    const sx = node.scaleX();
    const sy = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    node.width(Math.max(4, node.width() * sx));
    node.height(Math.max(4, node.height() * sy));
  }, []);

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const p = stage.getRelativePointerPosition();
    if (!p) return;

    if (toolMode === "text") {
      const t: TextShape = {
        id: uuidv4(),
        type: "text",
        x: p.x,
        y: p.y,
        rotation: 0,
        text: "New text",
        fontSize: 24,
        fontFamily: "DM Sans",
        fontStyle: "normal",
        fill: "#1a1d23",
        letterSpacing: 0,
        lineHeight: 1.2,
        align: "left",
        width: 280,
      };
      commit([...shapes, t]);
      setSelectedId(t.id);
      setToolMode("select");
      return;
    }

    if (toolMode === "cover") {
      setDraftCover({ sx: p.x, sy: p.y, cx: p.x, cy: p.y });
      return;
    }

    if (toolMode === "select" && e.target === stage) {
      setSelectedId(null);
    }
  };

  const handleStageMouseMove = () => {
    if (toolMode !== "cover" || !draftCover) return;
    const stage = stageRef.current;
    if (!stage) return;
    const p = stage.getRelativePointerPosition();
    if (!p) return;
    setDraftCover((d) => (d ? { ...d, cx: p.x, cy: p.y } : null));
  };

  const handleStageMouseUp = () => {
    if (toolMode !== "cover" || !draftCover) return;
    const { sx, sy, cx, cy } = draftCover;
    setDraftCover(null);
    const x = Math.min(sx, cx);
    const y = Math.min(sy, cy);
    const w = Math.abs(cx - sx);
    const h = Math.abs(cy - sy);
    if (w < 4 || h < 4) return;
    const c: CoverShape = {
      id: uuidv4(),
      type: "cover",
      x,
      y,
      width: w,
      height: h,
      rotation: 0,
      fill: lastPickedColor,
      opacity: 1,
    };
    commit([...shapes, c]);
    setSelectedId(c.id);
    setToolMode("select");
  };

  const pe =
    toolMode === "eyedropper" ? "none" : ("auto" as React.CSSProperties["pointerEvents"]);

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      style={{ position: "absolute", inset: 0, pointerEvents: pe }}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      onTouchStart={handleStageMouseDown}
      onTouchMove={handleStageMouseMove}
      onTouchEnd={handleStageMouseUp}
    >
      <Layer name="shapes">
        {shapes.map((s) => {
          if (s.type === "text") {
            return (
              <Text
                key={s.id}
                id={s.id}
                name={s.id}
                x={s.x}
                y={s.y}
                rotation={s.rotation}
                text={s.text}
                fontSize={s.fontSize}
                fontFamily={s.fontFamily}
                fontStyle={s.fontStyle}
                fill={s.fill}
                letterSpacing={s.letterSpacing}
                lineHeight={s.lineHeight}
                align={s.align}
                width={s.width}
                draggable={!s.locked && toolMode === "select"}
                onClick={(e) => {
                  e.cancelBubble = true;
                  setSelectedId(s.id);
                }}
                onTap={(e) => {
                  e.cancelBubble = true;
                  setSelectedId(s.id);
                }}
                onDragMove={(e) => {
                  snapNodeToGuides(e.target, width, height);
                }}
                onDragEnd={(e) => {
                  setGuides({ v: [], h: [] });
                  const n = e.target as Konva.Text;
                  const pos = applySnapGrid(n.x(), n.y());
                  n.position(pos);
                  commit(
                    shapes.map((sh) =>
                      sh.id === s.id && sh.type === "text"
                        ? {
                            ...sh,
                            x: n.x(),
                            y: n.y(),
                            rotation: n.rotation(),
                            width: n.width(),
                            fontSize: n.fontSize(),
                          }
                        : sh
                    )
                  );
                }}
                onTransformEnd={(e) => {
                  setGuides({ v: [], h: [] });
                  const n = e.target as Konva.Text;
                  bakeTextTransform(n);
                  commit(
                    shapes.map((sh) =>
                      sh.id === s.id && sh.type === "text"
                        ? {
                            ...sh,
                            x: n.x(),
                            y: n.y(),
                            rotation: n.rotation(),
                            width: n.width(),
                            fontSize: n.fontSize(),
                          }
                        : sh
                    )
                  );
                }}
              />
            );
          }
          return (
            <Rect
              key={s.id}
              id={s.id}
              name={s.id}
              x={s.x}
              y={s.y}
              width={s.width}
              height={s.height}
              rotation={s.rotation}
              fill={s.fill}
              opacity={s.opacity}
              draggable={!s.locked && toolMode === "select"}
              onClick={(e) => {
                e.cancelBubble = true;
                setSelectedId(s.id);
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                setSelectedId(s.id);
              }}
              onDragMove={(e) => {
                snapNodeToGuides(e.target, width, height);
              }}
              onDragEnd={(e) => {
                setGuides({ v: [], h: [] });
                const n = e.target as Konva.Rect;
                const pos = applySnapGrid(n.x(), n.y());
                n.position(pos);
                commit(
                  shapes.map((sh) =>
                    sh.id === s.id && sh.type === "cover"
                      ? {
                          ...sh,
                          x: n.x(),
                          y: n.y(),
                          width: n.width(),
                          height: n.height(),
                          rotation: n.rotation(),
                        }
                      : sh
                  )
                );
              }}
              onTransformEnd={(e) => {
                setGuides({ v: [], h: [] });
                const n = e.target as Konva.Rect;
                bakeRectTransform(n);
                commit(
                  shapes.map((sh) =>
                    sh.id === s.id && sh.type === "cover"
                      ? {
                          ...sh,
                          x: n.x(),
                          y: n.y(),
                          width: n.width(),
                          height: n.height(),
                          rotation: n.rotation(),
                        }
                      : sh
                  )
                );
              }}
            />
          );
        })}
      </Layer>
      <Layer name="transformer-ui">
        {showTransformer && (
          <Transformer
            ref={trRef}
            rotateEnabled
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 8 || newBox.height < 8) return oldBox;
              return newBox;
            }}
          />
        )}
      </Layer>
      <Layer listening={false} name="draft">
        {draftCover && (
          <Rect
            x={Math.min(draftCover.sx, draftCover.cx)}
            y={Math.min(draftCover.sy, draftCover.cy)}
            width={Math.abs(draftCover.cx - draftCover.sx)}
            height={Math.abs(draftCover.cy - draftCover.sy)}
            fill={lastPickedColor}
            opacity={0.5}
          />
        )}
      </Layer>
      <Layer listening={false} name="guides">
        {guides.v.map((x, i) => (
          <Line
            key={`v-${i}-${x}`}
            points={[x, 0, x, height]}
            stroke="#3b82f6"
            strokeWidth={1}
            dash={[6, 6]}
          />
        ))}
        {guides.h.map((y, i) => (
          <Line
            key={`h-${i}-${y}`}
            points={[0, y, width, y]}
            stroke="#3b82f6"
            strokeWidth={1}
            dash={[6, 6]}
          />
        ))}
      </Layer>
    </Stage>
  );
}
