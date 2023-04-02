import React, { useState } from "react";
import { render } from "react-dom";
import { Stage, Layer, Rect, Text, Line, Arrow } from "react-konva";
import { INITIAL_STATE, SIZE } from "./config";
import { Border } from "./Border";

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
  return (
    <div
      onDrop={(e) => {
        e.preventDefault();
        // register event position
        stageRef.current.setPointersPositions(e);
        // add image
        const position = e.target.position();
        setSteps({
          ...steps,
        });
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <Text text="CLick on the rectangle to connect." />
          {stepObjs}
          {borders}
          {connectionObjs}
          {connectionPreview}
        </Layer>
      </Stage>
    </div>
  );
};

render(<App />, document.getElementById("root"));
