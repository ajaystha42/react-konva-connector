import React, { useState } from "react";
import { render } from "react-dom";
import {
  Stage,
  Layer,
  Rect,
  Text,
  Line,
  Arrow,
  Transformer,
} from "react-konva";
import { INITIAL_STATE, SIZE } from "./config";
import { Border } from "./Border";
import Konva from "konva";

const Rectangle = ({ shapeProps, isSelected, onSelect, onChange }) => {
  const shapeRef = React.useRef();
  const trRef = React.useRef();

  React.useEffect(() => {
    if (isSelected) {
      // we need to attach transformer manually
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <Rect
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        {...shapeProps}
        draggable
        onDragEnd={(e) => {
          onChange({
            ...shapeProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          // transformer is changing scale of the node
          // and NOT its width or height
          // but in the store we have only width and height
          // to match the data better we will reset scale on transform end
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // we will reset it back
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            // set minimal value
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(node.height() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            // limit resize
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

function createConnectionPoints(source, destination) {
  console.log({ source, destination });
  return [source.x, source.y, destination.x, destination.y];
}

function hasIntersection(position, step) {
  return !(
    step.x > position.x ||
    step.x + SIZE < position.x ||
    step.y > position.y ||
    step.y + SIZE < position.y
  );
}

function detectConnection(position, id, steps) {
  const intersectingStep = Object.keys(steps).find((key) => {
    return key !== id && hasIntersection(position, steps[key]);
  });
  console.log({ intersectingStep });
  if (intersectingStep) {
    return intersectingStep;
  }
  return null;
}

const App = () => {
  const [selectedStep, setSelectedStep] = useState(null);
  const [connectionPreview, setConnectionPreview] = useState(null);
  const [connections, setConnections] = useState([]);
  const [steps, setSteps] = useState(INITIAL_STATE.steps);
  const dragUrl = React.useRef();
  const stageRef = React.useRef();
  const [h_lines, setHlines] = useState([]);
  const [v_lines, setVlines] = useState([]);
  const [selectedId, selectShape] = React.useState(null);

  const [rectangles, setRectangles] = useState([
    {
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      fill: Konva.Util.getRandomColor(),
      draggable: true,
      name: "object",
      offsetX: 50,
      offsetY: 50,
      id: "rect1",
    },
    {
      x: 120,
      y: 120,
      width: 120,
      height: 120,
      fill: Konva.Util.getRandomColor(),
      draggable: true,
      name: "object",
      offsetX: 50,
      offsetY: 50,
      id: "rect2",
    },
  ]);

  const checkDeselect = (e) => {
    // deselect when clicked on empty area
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectShape(null);
    }
  };

  const SCENE_BASE_WIDTH = 500;
  const SCENE_BASE_HEIGHT = 500;

  function handleSelection(id) {
    if (selectedStep === id) {
      setSelectedStep(null);
    } else {
      setSelectedStep(id);
    }
  }

  function handleStepDrag(e, key) {
    const position = e.target.position();
    setSteps({
      ...steps,
      [key]: {
        ...steps[key],
        ...position,
      },
    });
  }

  function handleAnchorDragStart(e) {
    const position = e.target.position();
    setConnectionPreview(
      <Line
        x={position.x}
        y={position.y}
        points={createConnectionPoints(position, position)}
        stroke="black"
        strokeWidth={2}
      />
    );
  }

  function getMousePos(e) {
    const position = e.target.position();
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    return {
      x: pointerPosition.x - position.x,
      y: pointerPosition.y - position.y,
    };
  }

  function handleAnchorDragMove(e) {
    const position = e.target.position();
    const mousePos = getMousePos(e);
    setConnectionPreview(
      <Line
        x={position.x}
        y={position.y}
        points={createConnectionPoints({ x: 0, y: 0 }, mousePos)}
        stroke="black"
        strokeWidth={2}
      />
    );
  }

  function handleAnchorDragEnd(e, id) {
    setConnectionPreview(null);
    const stage = e.target.getStage();
    const mousePos = stage.getPointerPosition();
    const connectionTo = detectConnection(mousePos, id, steps);
    if (connectionTo !== null) {
      setConnections([
        ...connections,
        {
          to: connectionTo,
          from: id,
        },
      ]);
    }
  }

  const stepObjs = Object.keys(steps).map((key) => {
    const { x, y, colour } = steps[key];
    return (
      <Rect
        key={key}
        x={x}
        y={y}
        width={SIZE}
        height={SIZE}
        fill={colour}
        onClick={() => handleSelection(key)}
        draggable
        onDragMove={(e) => handleStepDrag(e, key)}
        perfectDrawEnabled={false}
        // _useStrictMode
      />
    );
  });
  const connectionObjs = connections.map((connection) => {
    const fromStep = steps[connection.from];
    const toStep = steps[connection.to];
    const lineEnd = {
      x: toStep.x - fromStep.x,
      y: toStep.y - fromStep.y + SIZE / 2,
    };

    const points = createConnectionPoints({ x: SIZE, y: SIZE / 2 }, lineEnd);
    console.log({ points });
    console.log({ fromStep, toStep });
    console.log({ lineEnd });
    return (
      <Arrow
        x={fromStep.x}
        y={fromStep.y}
        points={points}
        stroke="black"
        strokeWidth={3}
      />
    );
  });
  const borders =
    selectedStep !== null ? (
      <Border
        id={selectedStep}
        step={steps[selectedStep]}
        onAnchorDragEnd={(e) => handleAnchorDragEnd(e, selectedStep)}
        onAnchorDragMove={handleAnchorDragMove}
        onAnchorDragStart={handleAnchorDragStart}
      />
    ) : null;

  console.log({ selectedId });
  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Text text="CLick on the rectangle to connect." />
        {/* {stepObjs} */}
        {rectangles.map((rect, i) => {
          console.log({ rect, i });
          return (
            <Rectangle
              key={i}
              shapeProps={rect}
              isSelected={rect.id === selectedId}
              onSelect={() => {
                selectShape(rect.id);
              }}
              onChange={(newAttrs) => {
                const rects = rectangles.slice();
                rects[i] = newAttrs;
                setRectangles(rects);
              }}
            />
          );
        })}
        {/* {borders}
        {connectionObjs}
        {connectionPreview} */}
      </Layer>
    </Stage>
  );
};

render(<App />, document.getElementById("root"));
