import React, { useEffect, useState, useRef } from "react";
import Konva from "konva";
import { Stage, Layer, Transformer, Rect, Line } from "react-konva";

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
            y: e.target.y()
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
            height: Math.max(node.height() * scaleY)
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

const SnappingStage = () => {
  const GUIDELINE_OFFSET = 5;

  const stage = useRef();

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
      id: "rect1"
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
      id: "rect2"
    }
  ]);

  const checkDeselect = (e) => {
    // deselect when clicked on empty area
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectShape(null);
    }
  };

  const SCENE_BASE_WIDTH = 500;
  const SCENE_BASE_HEIGHT = window.innerHeight/2;

  useEffect(() => {}, []);

  // where can we snap our objects?
  const getLineGuideStops = (skipShape) => {
    // we can snap to stage borders and the center of the stage
    var vertical = [0, stage.current.width() / 2, stage.current.width()];
    var horizontal = [0, stage.current.height() / 2, stage.current.height()];

    // and we snap over edges and center of each object on the canvas
    stage.current.find(".object").forEach((guideItem) => {
      if (guideItem === skipShape) {
        return;
      }
      var box = guideItem.getClientRect({ relativeTo: stage.current });
      // and we can snap to all edges of shapes
      vertical.push([box.x, box.x + box.width, box.x + box.width / 2]);
      horizontal.push([box.y, box.y + box.height, box.y + box.height / 2]);
    });
    return {
      vertical: vertical.flat(),
      horizontal: horizontal.flat()
    };
  };

  // what points of the object will trigger to snapping?
  // it can be just center of the object
  // but we will enable all edges and center
  const getObjectSnappingEdges = (node) => {
    var box = node.getClientRect({ relativeTo: stage.current });
    var absPos = node.absolutePosition();

    return {
      vertical: [
        {
          guide: Math.round(box.x),
          offset: Math.round(absPos.x - box.x),
          snap: "start"
        },
        {
          guide: Math.round(box.x + box.width / 2),
          offset: Math.round(absPos.x - box.x - box.width / 2),
          snap: "center"
        },
        {
          guide: Math.round(box.x + box.width),
          offset: Math.round(absPos.x - box.x - box.width),
          snap: "end"
        }
      ],
      horizontal: [
        {
          guide: Math.round(box.y),
          offset: Math.round(absPos.y - box.y),
          snap: "start"
        },
        {
          guide: Math.round(box.y + box.height / 2),
          offset: Math.round(absPos.y - box.y - box.height / 2),
          snap: "center"
        },
        {
          guide: Math.round(box.y + box.height),
          offset: Math.round(absPos.y - box.y - box.height),
          snap: "end"
        }
      ]
    };
  };

  // find all snapping possibilities
  const getGuides = (lineGuideStops, itemBounds) => {
    var resultV = [];
    var resultH = [];

    lineGuideStops.vertical.forEach((lineGuide) => {
      itemBounds.vertical.forEach((itemBound) => {
        var diff = Math.abs(lineGuide - itemBound.guide);
        // if the distance between guild line and object snap point is close we can consider this for snapping
        if (diff < GUIDELINE_OFFSET) {
          resultV.push({
            lineGuide: lineGuide,
            diff: diff,
            snap: itemBound.snap,
            offset: itemBound.offset
          });
        }
      });
    });

    lineGuideStops.horizontal.forEach((lineGuide) => {
      itemBounds.horizontal.forEach((itemBound) => {
        var diff = Math.abs(lineGuide - itemBound.guide);
        if (diff < GUIDELINE_OFFSET) {
          resultH.push({
            lineGuide: lineGuide,
            diff: diff,
            snap: itemBound.snap,
            offset: itemBound.offset
          });
        }
      });
    });

    var guides = [];

    // find closest snap
    var minV = resultV.sort((a, b) => a.diff - b.diff)[0];
    var minH = resultH.sort((a, b) => a.diff - b.diff)[0];
    if (minV) {
      guides.push({
        lineGuide: minV.lineGuide,
        offset: minV.offset,
        orientation: "V",
        snap: minV.snap
      });
    }
    if (minH) {
      guides.push({
        lineGuide: minH.lineGuide,
        offset: minH.offset,
        orientation: "H",
        snap: minH.snap
      });
    }
    return guides;
  };

  const drawGuides = (guides) => {
    if (guides) {
      guides.forEach((lg) => {
        if (lg.orientation === "H") {
          let guide = {
            points: [-6000, 0, 6000, 0],
            stroke: "rgb(0, 161, 255)",
            strokeWidth: 1,
            name: "guid-line",
            dash: [4, 6],
            x: 0,
            y: lg.lineGuide
          };
          setHlines([...guides, guide]);
        } else if (lg.orientation === "V") {
          let guide = {
            points: [0, -6000, 0, 6000],
            stroke: "rgb(0, 161, 255)",
            strokeWidth: 1,
            name: "guid-line",
            dash: [4, 6],
            x: lg.lineGuide,
            y: 0
          };
          setVlines([...guides, guide]);
        }
      });
    }
  };

  const onDragMove = (e) => {
    // clear all previous lines on the screen
    // layer.find('.guid-line').destroy();

    // find possible snapping lines
    var lineGuideStops = getLineGuideStops(e.target);
    // find snapping points of current object
    var itemBounds = getObjectSnappingEdges(e.target);

    // now find where can we snap current object
    var guides = getGuides(lineGuideStops, itemBounds);

    // do nothing of no snapping
    if (!guides.length) {
      return;
    }

    drawGuides(guides);

    var absPos = e.target.absolutePosition();
    // now force object position
    guides.forEach((lg) => {
      switch (lg.snap) {
        case "start": {
          switch (lg.orientation) {
            case "V": {
              absPos.x = lg.lineGuide + lg.offset;
              break;
            }
            case "H": {
              absPos.y = lg.lineGuide + lg.offset;
              break;
            }
            default:
              break;
          }
          break;
        }
        case "center": {
          switch (lg.orientation) {
            case "V": {
              absPos.x = lg.lineGuide + lg.offset;
              break;
            }
            case "H": {
              absPos.y = lg.lineGuide + lg.offset;
              break;
            }
            default:
              break;
          }
          break;
        }
        case "end": {
          switch (lg.orientation) {
            case "V": {
              absPos.x = lg.lineGuide + lg.offset;
              break;
            }
            case "H": {
              absPos.y = lg.lineGuide + lg.offset;
              break;
            }
            default:
              break;
          }
          break;
        }
        default:
          break;
      }
    });
    e.target.absolutePosition(absPos);
  };

  const onDragEnd = (e) => {
    setHlines([]);
    setVlines([]);
  };

  return (
    <div
      style={{
        backgroundColor: "#000",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        padding: "50px"
      }}
    >
      <div
        style={{
          backgroundColor: "#fff"
        }}
      >
        <Stage
          ref={stage}
          width={SCENE_BASE_WIDTH}
          height={SCENE_BASE_HEIGHT}
          onMouseDown={checkDeselect}
          onTouchStart={checkDeselect}
        >
          <Layer
            onDragMove={(e) => onDragMove(e)}
            onDragEnd={(e) => onDragEnd(e)}
          >
            {rectangles.map((rect, i) => {
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
            {h_lines.map((item, i) => {
              return <Line key={i} {...item} />;
            })}
            {v_lines.map((item, i) => {
              return <Line key={i} {...item} />;
            })}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

export default SnappingStage;
